/**
 * Feishu event handling - WebSocket long connection mode
 */

import * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuChannelConfig } from "../config/schema.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("feishu-events");

/**
 * Message received event data
 */
export interface MessageReceivedEvent {
  messageId: string;
  chatId: string;
  chatType: "p2p" | "group";
  senderId: string;
  senderType: "user" | "bot";
  messageType: string;
  content: string;
  mentions?: Array<{
    id: string;
    name: string;
    key: string;
  }>;
  rootId?: string;
  parentId?: string;
  createTime: string;
}

/**
 * Card action event data
 */
export interface CardActionEvent {
  operator: {
    openId: string;
    userId?: string;
  };
  action: {
    value: Record<string, unknown>;
    tag: string;
  };
  token: string;
  openMessageId: string;
  openChatId: string;
}

/**
 * Event handler type
 */
export type EventHandler<T> = (event: T) => void | Promise<void>;

/**
 * Event dispatcher for managing handlers
 */
export class EventDispatcher {
  private messageHandlers: EventHandler<MessageReceivedEvent>[] = [];
  private cardActionHandlers: EventHandler<CardActionEvent>[] = [];

  onMessage(handler: EventHandler<MessageReceivedEvent>): void {
    this.messageHandlers.push(handler);
  }

  onCardAction(handler: EventHandler<CardActionEvent>): void {
    this.cardActionHandlers.push(handler);
  }

  async dispatchMessage(event: MessageReceivedEvent): Promise<void> {
    for (const handler of this.messageHandlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error("Error in message handler", error);
      }
    }
  }

  async dispatchCardAction(event: CardActionEvent): Promise<void> {
    for (const handler of this.cardActionHandlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error("Error in card action handler", error);
      }
    }
  }
}

/**
 * Parse message content from event
 */
function parseMessageContent(
  msgType: string,
  content: string
): string {
  try {
    const parsed = JSON.parse(content);
    if (msgType === "text") {
      return parsed.text ?? "";
    }
    return content;
  } catch {
    return content;
  }
}

/**
 * Create event handler for message events
 */
function createMessageHandler(dispatcher: EventDispatcher) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (data: any) => {
    try {
      const message = data.message;
      const sender = data.sender;

      const messageEvent: MessageReceivedEvent = {
        messageId: message.message_id,
        chatId: message.chat_id,
        chatType: message.chat_type === "p2p" ? "p2p" : "group",
        senderId: sender.sender_id?.open_id ?? "",
        senderType: sender.sender_type === "user" ? "user" : "bot",
        messageType: message.message_type,
        content: parseMessageContent(message.message_type, message.content),
        mentions: message.mentions?.map((m: { id?: { open_id?: string }; name: string; key: string }) => ({
          id: m.id?.open_id ?? "",
          name: m.name,
          key: m.key,
        })),
        rootId: message.root_id,
        parentId: message.parent_id,
        createTime: message.create_time,
      };

      logger.debug("Message received", { messageId: message.message_id });
      await dispatcher.dispatchMessage(messageEvent);
    } catch (error) {
      logger.error("Error processing message event", error);
    }
  };
}

/**
 * Start WebSocket event listener
 */
export function startWebSocketListener(
  config: FeishuChannelConfig,
  dispatcher: EventDispatcher
): lark.WSClient {
  try {
    const messageHandler = createMessageHandler(dispatcher);

    logger.debug("Creating Feishu event dispatcher...");

    // Create the event dispatcher for the SDK
    const larkEventDispatcher = new lark.EventDispatcher({});

    // Register the event handler
    larkEventDispatcher.register({
      "im.message.receive_v1": messageHandler,
    });

    logger.debug("Registered message event handler");

    // Create and start the WebSocket client
    logger.debug("Creating Feishu WSClient...", { appId: config.appId });
    const wsClient = new lark.WSClient({
      appId: config.appId,
      appSecret: config.appSecret,
    });

    // The WSClient uses internal event handling
    // We need to start it and let the SDK handle events
    logger.debug("Starting Feishu WSClient...");
    wsClient.start({
      eventDispatcher: larkEventDispatcher,
    });

    logger.info("Feishu WebSocket listener started", { appId: config.appId });

    return wsClient;
  } catch (error) {
    const errorDetail = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { raw: String(error) };
    logger.error("Error in startWebSocketListener", errorDetail);
    throw error;
  }
}

/**
 * Stop WebSocket listener
 */
export function stopWebSocketListener(_wsClient: lark.WSClient): void {
  // The SDK doesn't expose a direct stop method, but we can clean up
  logger.info("WebSocket listener stopped");
}
