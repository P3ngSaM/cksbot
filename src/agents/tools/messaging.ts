/**
 * Feishu messaging tools
 */

import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { getFeishuClient, sendTextMessage, replyTextMessage } from "../../feishu/index.js";
import { sendCardMessage, buildTextCard, buildStatusCard } from "../../feishu/cards.js";

/**
 * Create messaging tools
 */
export function createMessagingTools(): AgentTool[] {
  return [
    createSendMessageTool(),
    createReplyMessageTool(),
    createSendCardTool(),
  ];
}

/**
 * Send message tool
 */
function createSendMessageTool(): AgentTool {
  return {
    name: "feishu_send_message",
    description: "发送飞书消息给用户或群组。使用此工具向指定的用户或群组发送文本消息。",
    inputSchema: {
      type: "object",
      properties: {
        receive_id: {
          type: "string",
          description: "接收者ID，可以是用户的open_id或群组的chat_id",
        },
        receive_id_type: {
          type: "string",
          enum: ["open_id", "user_id", "chat_id"],
          description: "接收者ID类型",
        },
        text: {
          type: "string",
          description: "要发送的消息内容",
        },
      },
      required: ["receive_id", "receive_id_type", "text"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const receiveId = input["receive_id"] as string;
      const receiveIdType = input["receive_id_type"] as "open_id" | "user_id" | "chat_id";
      const text = input["text"] as string;

      const client = getFeishuClient(feishuConfig);
      const result = await sendTextMessage(client, receiveId, text, receiveIdType);

      if (result.success) {
        return {
          success: true,
          result: { messageId: result.messageId, status: "sent" },
        };
      }

      return { success: false, error: result.error };
    },
  };
}

/**
 * Reply message tool
 */
function createReplyMessageTool(): AgentTool {
  return {
    name: "feishu_reply_message",
    description: "回复飞书消息。使用此工具回复特定的消息。",
    inputSchema: {
      type: "object",
      properties: {
        message_id: {
          type: "string",
          description: "要回复的消息ID",
        },
        text: {
          type: "string",
          description: "回复的内容",
        },
      },
      required: ["message_id", "text"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const messageId = input["message_id"] as string;
      const text = input["text"] as string;

      const client = getFeishuClient(feishuConfig);
      const result = await replyTextMessage(client, messageId, text);

      if (result.success) {
        return {
          success: true,
          result: { messageId: result.messageId, status: "replied" },
        };
      }

      return { success: false, error: result.error };
    },
  };
}

/**
 * Send card tool
 */
function createSendCardTool(): AgentTool {
  return {
    name: "feishu_send_card",
    description: "发送飞书卡片消息。卡片消息支持更丰富的格式和交互。",
    inputSchema: {
      type: "object",
      properties: {
        receive_id: {
          type: "string",
          description: "接收者ID，可以是用户的open_id或群组的chat_id",
        },
        receive_id_type: {
          type: "string",
          enum: ["open_id", "user_id", "chat_id"],
          description: "接收者ID类型",
        },
        title: {
          type: "string",
          description: "卡片标题",
        },
        content: {
          type: "string",
          description: "卡片内容，支持Markdown格式",
        },
        card_type: {
          type: "string",
          enum: ["default", "success", "error", "warning", "info"],
          description: "卡片类型，决定卡片的颜色主题",
        },
      },
      required: ["receive_id", "receive_id_type", "title", "content"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const receiveId = input["receive_id"] as string;
      const receiveIdType = input["receive_id_type"] as "open_id" | "user_id" | "chat_id";
      const title = input["title"] as string;
      const content = input["content"] as string;
      const cardType = (input["card_type"] as string) ?? "default";

      const client = getFeishuClient(feishuConfig);

      let card;
      if (cardType === "default") {
        card = buildTextCard(title, content);
      } else {
        card = buildStatusCard(
          cardType as "success" | "error" | "warning" | "info",
          title,
          content
        );
      }

      const result = await sendCardMessage(client, receiveId, card, receiveIdType);

      if (result.success) {
        return {
          success: true,
          result: { messageId: result.messageId, status: "sent" },
        };
      }

      return { success: false, error: result.error };
    },
  };
}
