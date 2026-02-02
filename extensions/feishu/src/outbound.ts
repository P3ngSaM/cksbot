/**
 * Feishu outbound message handling
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import { createLogger } from "../../../src/utils/logger.js";

const logger = createLogger("feishu-outbound");

/**
 * Send result
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a text message
 */
export async function sendText(
  client: lark.Client,
  chatId: string,
  text: string,
  replyTo?: string
): Promise<SendResult> {
  try {
    const content = JSON.stringify({ text });

    if (replyTo) {
      const response = await client.im.message.reply({
        path: { message_id: replyTo },
        data: {
          msg_type: "text",
          content,
        },
      });

      if (response.code === 0 && response.data?.message_id) {
        return { success: true, messageId: response.data.message_id };
      }
      return { success: false, error: response.msg ?? "Failed to reply" };
    }

    const response = await client.im.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chatId,
        msg_type: "text",
        content,
      },
    });

    if (response.code === 0 && response.data?.message_id) {
      return { success: true, messageId: response.data.message_id };
    }
    return { success: false, error: response.msg ?? "Failed to send" };
  } catch (error) {
    logger.error("Failed to send text", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a card message
 */
export async function sendCard(
  client: lark.Client,
  chatId: string,
  card: object,
  replyTo?: string
): Promise<SendResult> {
  try {
    const content = JSON.stringify(card);

    if (replyTo) {
      const response = await client.im.message.reply({
        path: { message_id: replyTo },
        data: {
          msg_type: "interactive",
          content,
        },
      });

      if (response.code === 0 && response.data?.message_id) {
        return { success: true, messageId: response.data.message_id };
      }
      return { success: false, error: response.msg ?? "Failed to reply" };
    }

    const response = await client.im.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chatId,
        msg_type: "interactive",
        content,
      },
    });

    if (response.code === 0 && response.data?.message_id) {
      return { success: true, messageId: response.data.message_id };
    }
    return { success: false, error: response.msg ?? "Failed to send" };
  } catch (error) {
    logger.error("Failed to send card", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send an image message
 */
export async function sendImage(
  client: lark.Client,
  chatId: string,
  imageKey: string,
  replyTo?: string
): Promise<SendResult> {
  try {
    const content = JSON.stringify({ image_key: imageKey });

    if (replyTo) {
      const response = await client.im.message.reply({
        path: { message_id: replyTo },
        data: {
          msg_type: "image",
          content,
        },
      });

      if (response.code === 0 && response.data?.message_id) {
        return { success: true, messageId: response.data.message_id };
      }
      return { success: false, error: response.msg ?? "Failed to reply" };
    }

    const response = await client.im.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chatId,
        msg_type: "image",
        content,
      },
    });

    if (response.code === 0 && response.data?.message_id) {
      return { success: true, messageId: response.data.message_id };
    }
    return { success: false, error: response.msg ?? "Failed to send" };
  } catch (error) {
    logger.error("Failed to send image", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add a reaction to a message
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
    logger.error("Failed to add reaction", error);
    return false;
  }
}

/**
 * Update a card message
 */
export async function updateCard(
  client: lark.Client,
  messageId: string,
  card: object
): Promise<boolean> {
  try {
    const response = await client.im.message.patch({
      path: { message_id: messageId },
      data: {
        content: JSON.stringify(card),
      },
    });

    return response.code === 0;
  } catch (error) {
    logger.error("Failed to update card", error);
    return false;
  }
}
