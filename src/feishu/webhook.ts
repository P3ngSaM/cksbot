/**
 * Feishu Webhook HTTP callback mode
 */

import { Hono } from "hono";
import type { FeishuChannelConfig } from "../config/schema.js";
import { decryptEventBody } from "./auth.js";
import type { EventDispatcher, MessageReceivedEvent, CardActionEvent } from "./events.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("feishu-webhook");

/**
 * Webhook challenge response
 */
interface ChallengeRequest {
  challenge: string;
  token: string;
  type: "url_verification";
}

/**
 * Webhook event envelope
 */
interface EventEnvelope {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: unknown;
}

/**
 * Encrypted event body
 */
interface EncryptedBody {
  encrypt: string;
}

/**
 * Create a Hono app for handling Feishu webhooks
 */
export function createWebhookApp(
  config: FeishuChannelConfig,
  dispatcher: EventDispatcher
): Hono {
  const app = new Hono();

  app.post("/webhook/feishu", async (c) => {
    try {
      let body = await c.req.json<unknown>();

      // Handle encrypted body
      if (config.encryptKey && isEncryptedBody(body)) {
        const decrypted = decryptEventBody(body.encrypt, config.encryptKey);
        if (!decrypted) {
          logger.error("Failed to decrypt webhook body");
          return c.json({ error: "Decryption failed" }, 400);
        }
        body = JSON.parse(decrypted);
      }

      // Handle URL verification challenge
      if (isChallengeRequest(body)) {
        logger.info("Received URL verification challenge");
        return c.json({ challenge: body.challenge });
      }

      // Handle event
      if (isEventEnvelope(body)) {
        await handleEvent(body, config, dispatcher);
        return c.json({ success: true });
      }

      logger.warn("Unknown webhook body format", { body });
      return c.json({ success: true });
    } catch (error) {
      logger.error("Error processing webhook", error);
      return c.json({ error: "Internal error" }, 500);
    }
  });

  // Card action callback
  app.post("/webhook/feishu/card", async (c) => {
    try {
      const body = await c.req.json<{
        open_id: string;
        user_id?: string;
        action: {
          value: Record<string, unknown>;
          tag: string;
        };
        token: string;
        open_message_id: string;
        open_chat_id: string;
      }>();

      const cardEvent: CardActionEvent = {
        operator: {
          openId: body.open_id,
          userId: body.user_id,
        },
        action: body.action,
        token: body.token,
        openMessageId: body.open_message_id,
        openChatId: body.open_chat_id,
      };

      await dispatcher.dispatchCardAction(cardEvent);
      return c.json({ success: true });
    } catch (error) {
      logger.error("Error processing card action", error);
      return c.json({ error: "Internal error" }, 500);
    }
  });

  return app;
}

function isEncryptedBody(body: unknown): body is EncryptedBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "encrypt" in body &&
    typeof (body as EncryptedBody).encrypt === "string"
  );
}

function isChallengeRequest(body: unknown): body is ChallengeRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    "type" in body &&
    (body as ChallengeRequest).type === "url_verification"
  );
}

function isEventEnvelope(body: unknown): body is EventEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    "schema" in body &&
    "header" in body &&
    "event" in body
  );
}

async function handleEvent(
  envelope: EventEnvelope,
  config: FeishuChannelConfig,
  dispatcher: EventDispatcher
): Promise<void> {
  const { header, event } = envelope;

  // Verify token if configured
  if (config.verificationToken && header.token !== config.verificationToken) {
    logger.warn("Invalid verification token");
    return;
  }

  logger.debug("Received event", { eventType: header.event_type, eventId: header.event_id });

  switch (header.event_type) {
    case "im.message.receive_v1":
      await handleMessageEvent(event, dispatcher);
      break;
    default:
      logger.debug("Unhandled event type", { eventType: header.event_type });
  }
}

async function handleMessageEvent(
  event: unknown,
  dispatcher: EventDispatcher
): Promise<void> {
  const data = event as {
    message: {
      message_id: string;
      chat_id: string;
      chat_type: string;
      message_type: string;
      content: string;
      mentions?: Array<{
        id: { open_id: string };
        name: string;
        key: string;
      }>;
      root_id?: string;
      parent_id?: string;
      create_time: string;
    };
    sender: {
      sender_id: { open_id: string };
      sender_type: string;
    };
  };

  const message = data.message;
  const sender = data.sender;

  let content = message.content;
  try {
    const parsed = JSON.parse(content);
    if (message.message_type === "text") {
      content = parsed.text ?? "";
    }
  } catch {
    // Keep original content
  }

  const messageEvent: MessageReceivedEvent = {
    messageId: message.message_id,
    chatId: message.chat_id,
    chatType: message.chat_type === "p2p" ? "p2p" : "group",
    senderId: sender.sender_id.open_id,
    senderType: sender.sender_type === "user" ? "user" : "bot",
    messageType: message.message_type,
    content,
    mentions: message.mentions?.map((m) => ({
      id: m.id.open_id,
      name: m.name,
      key: m.key,
    })),
    rootId: message.root_id,
    parentId: message.parent_id,
    createTime: message.create_time,
  };

  await dispatcher.dispatchMessage(messageEvent);
}
