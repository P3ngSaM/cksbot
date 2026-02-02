/**
 * Feishu channel plugin implementation
 */

import * as lark from "@larksuiteoapi/node-sdk";
import type {
  ChannelPlugin,
  ChannelContext,
  ChannelCapabilities,
  InboundMessage,
  MessageHandler,
} from "../../../src/plugins/types.js";
import type { FeishuChannelConfig } from "../../../src/config/schema.js";

let wsClient: lark.WSClient | null = null;
let storedMessageHandler: MessageHandler | null = null;

/**
 * Feishu channel capabilities
 */
const capabilities: ChannelCapabilities = {
  chatTypes: ["direct", "group"],
  reactions: true,
  threads: true,
  media: true,
  cards: true,
};

/**
 * Process message event
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMessageEvent(
  data: any,
  config: FeishuChannelConfig
): Promise<void> {
  if (!storedMessageHandler) return;

  const message = data.message;
  const sender = data.sender;

  // Skip messages from bots
  if (sender.sender_type !== "user") {
    return;
  }

  // Parse content
  let content = message.content;
  try {
    const parsed = JSON.parse(content);
    if (message.message_type === "text") {
      content = parsed.text ?? "";
    }
  } catch {
    // Keep original
  }

  // Check mention requirement
  if (config.requireMention && message.chat_type === "group") {
    if (!message.mentions || message.mentions.length === 0) {
      return;
    }
    // Remove mention from content
    for (const mention of message.mentions) {
      content = content.replace(mention.key, "").trim();
    }
  }

  const inboundMessage: InboundMessage = {
    id: message.message_id,
    channelId: "feishu",
    chatId: message.chat_id,
    chatType: message.chat_type === "p2p" ? "direct" : "group",
    senderId: sender.sender_id?.open_id ?? "",
    content,
    contentType: "text",
    mentions: message.mentions?.map((m: { id?: { open_id?: string }; name: string }) => ({
      id: m.id?.open_id ?? "",
      name: m.name,
    })),
    replyTo: message.parent_id,
    threadId: message.root_id,
    timestamp: new Date(parseInt(message.create_time)),
    raw: data,
  };

  await storedMessageHandler(inboundMessage);
}

/**
 * Start the Feishu channel
 */
async function startChannel(ctx: ChannelContext): Promise<void> {
  const config = ctx.channelConfig as FeishuChannelConfig;

  if (!config) {
    throw new Error("Feishu channel not configured");
  }

  // The onMessage is called with a handler - we store it for later use
  // But we need to register OUR handler that will call the stored one
  ctx.onMessage((message: InboundMessage) => {
    // This won't be called directly - we use the SDK event dispatcher
    // This is just to satisfy the interface
    if (storedMessageHandler) {
      storedMessageHandler(message);
    }
  });

  if (config.mode === "websocket") {
    await startWebSocketMode(config);
  }
  // Webhook mode is handled by the gateway HTTP server
}

/**
 * Start WebSocket mode
 */
async function startWebSocketMode(config: FeishuChannelConfig): Promise<void> {
  // Create the event dispatcher for the SDK
  const larkEventDispatcher = new lark.EventDispatcher({});

  // Register the event handler
  larkEventDispatcher.register({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "im.message.receive_v1": async (data: any) => {
      await processMessageEvent(data, config);
    },
  });

  // Create the WebSocket client
  wsClient = new lark.WSClient({
    appId: config.appId,
    appSecret: config.appSecret,
  });

  // Start with the event dispatcher
  wsClient.start({
    eventDispatcher: larkEventDispatcher,
  });
}

/**
 * Stop the Feishu channel
 */
async function stopChannel(): Promise<void> {
  // WSClient doesn't have a clean stop method
  // Just clear references
  wsClient = null;
  storedMessageHandler = null;
}

/**
 * Send a text message
 */
async function sendText(_params: {
  to: string;
  text: string;
  replyTo?: string;
}): Promise<{ messageId: string }> {
  // This will be called with a client from the channel context
  // For now, throw an error - actual implementation uses getFeishuClient
  throw new Error("sendText should be called through the feishu module");
}

/**
 * Send a card message
 */
async function sendCard(_params: {
  to: string;
  card: unknown;
  replyTo?: string;
}): Promise<{ messageId: string }> {
  throw new Error("sendCard should be called through the feishu module");
}

/**
 * Add a reaction
 */
async function addReaction(_params: {
  messageId: string;
  reaction: string;
}): Promise<void> {
  throw new Error("addReaction should be called through the feishu module");
}

/**
 * Feishu channel plugin
 */
export const feishuChannelPlugin: ChannelPlugin = {
  id: "feishu",
  capabilities,
  gateway: {
    start: startChannel,
    stop: stopChannel,
  },
  outbound: {
    sendText,
    sendCard,
    addReaction,
  },
};
