/**
 * Feishu message sending utilities
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("feishu-messages");

export type ReceiveIdType = "open_id" | "user_id" | "union_id" | "email" | "chat_id";

export interface SendMessageOptions {
  receiveId: string;
  receiveIdType: ReceiveIdType;
  msgType: "text" | "post" | "image" | "interactive" | "share_chat" | "share_user" | "audio" | "media" | "file" | "sticker";
  content: string;
  uuid?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a message to a user or chat
 */
export async function sendMessage(
  client: lark.Client,
  options: SendMessageOptions
): Promise<SendMessageResult> {
  try {
    const response = await client.im.message.create({
      params: {
        receive_id_type: options.receiveIdType,
      },
      data: {
        receive_id: options.receiveId,
        msg_type: options.msgType,
        content: options.content,
        uuid: options.uuid,
      },
    });

    if (response.code === 0 && response.data?.message_id) {
      logger.debug("Message sent successfully", { messageId: response.data.message_id });
      return {
        success: true,
        messageId: response.data.message_id,
      };
    }

    logger.error("Failed to send message", { code: response.code, msg: response.msg });
    return {
      success: false,
      error: response.msg ?? "Unknown error",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to send message", { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a text message
 */
export async function sendTextMessage(
  client: lark.Client,
  receiveId: string,
  text: string,
  receiveIdType: ReceiveIdType = "chat_id"
): Promise<SendMessageResult> {
  const content = JSON.stringify({ text });
  return sendMessage(client, {
    receiveId,
    receiveIdType,
    msgType: "text",
    content,
  });
}

/**
 * Reply to a message
 */
export async function replyMessage(
  client: lark.Client,
  messageId: string,
  msgType: "text" | "post" | "image" | "interactive",
  content: string
): Promise<SendMessageResult> {
  try {
    const response = await client.im.message.reply({
      path: {
        message_id: messageId,
      },
      data: {
        msg_type: msgType,
        content,
      },
    });

    if (response.code === 0 && response.data?.message_id) {
      logger.debug("Reply sent successfully", { messageId: response.data.message_id });
      return {
        success: true,
        messageId: response.data.message_id,
      };
    }

    logger.error("Failed to reply to message", { code: response.code, msg: response.msg });
    return {
      success: false,
      error: response.msg ?? "Unknown error",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to reply to message", { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Reply with text
 */
export async function replyTextMessage(
  client: lark.Client,
  messageId: string,
  text: string
): Promise<SendMessageResult> {
  const content = JSON.stringify({ text });
  return replyMessage(client, messageId, "text", content);
}

/**
 * Get message content
 */
export async function getMessage(
  client: lark.Client,
  messageId: string
): Promise<{
  messageId: string;
  msgType: string;
  content: string;
  senderId: string;
  chatId: string;
  createTime: string;
} | null> {
  try {
    const response = await client.im.message.get({
      path: { message_id: messageId },
    });

    if (response.code === 0 && response.data?.items?.[0]) {
      const msg = response.data.items[0];
      return {
        messageId: msg.message_id ?? messageId,
        msgType: msg.msg_type ?? "text",
        content: msg.body?.content ?? "",
        senderId: msg.sender?.id ?? "",
        chatId: msg.chat_id ?? "",
        createTime: msg.create_time ?? "",
      };
    }
    return null;
  } catch (error) {
    logger.error("Failed to get message", { messageId, error });
    return null;
  }
}

/**
 * Add reaction to a message
 */
export async function addReaction(
  client: lark.Client,
  messageId: string,
  emojiType: string
): Promise<boolean> {
  try {
    const response = await client.im.messageReaction.create({
      path: { message_id: messageId },
      data: {
        reaction_type: { emoji_type: emojiType },
      },
    });

    return response.code === 0;
  } catch (error) {
    logger.error("Failed to add reaction", { messageId, emojiType, error });
    return false;
  }
}
