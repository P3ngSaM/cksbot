/**
 * Feishu contact tools - 通讯录工具
 */

import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { getFeishuClient } from "../../feishu/client.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("contact-tools");

/**
 * Create contact tools
 */
export function createContactTools(): AgentTool[] {
  return [
    createSearchUserTool(),
    createGetUserTool(),
  ];
}

/**
 * Search user by name or email
 */
function createSearchUserTool(): AgentTool {
  return {
    name: "feishu_search_user",
    description: "根据姓名或邮箱搜索飞书用户。返回用户的 open_id，可用于发送消息。",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词（用户姓名或邮箱）",
        },
      },
      required: ["query"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const query = input["query"] as string;

      try {
        const client = getFeishuClient(feishuConfig);

        // Use search API to find users
        // Note: Using 'any' due to SDK type limitations
        const response = await (client.search as any).user.create({
          params: {
            user_id_type: "open_id",
            page_size: 10,
          },
          data: {
            query,
          },
        });

        if (response.code === 0 && response.data?.users) {
          const users = response.data.users.map((user: any) => ({
            openId: user.open_id,
            name: user.name,
            enName: user.en_name,
            email: user.email,
            department: user.department_ids?.[0],
          }));

          return {
            success: true,
            result: {
              users,
              total: users.length,
              hint: "使用 open_id 作为 receive_id 发送消息，receive_id_type 设为 open_id",
            },
          };
        }

        // If search API fails, try listing users from department
        return {
          success: false,
          error: response.msg ?? "搜索用户失败，请确保应用有通讯录权限",
        };
      } catch (error) {
        logger.error("Failed to search user", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}

/**
 * Get user info by ID
 */
function createGetUserTool(): AgentTool {
  return {
    name: "feishu_get_user",
    description: "根据用户ID获取用户详细信息。",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "用户ID (open_id 或 user_id)",
        },
        user_id_type: {
          type: "string",
          enum: ["open_id", "user_id", "union_id"],
          description: "用户ID类型，默认 open_id",
        },
      },
      required: ["user_id"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const userId = input["user_id"] as string;
      const userIdType = (input["user_id_type"] as string) ?? "open_id";

      try {
        const client = getFeishuClient(feishuConfig);

        const response = await client.contact.user.get({
          path: { user_id: userId },
          params: { user_id_type: userIdType as "open_id" | "user_id" | "union_id" },
        });

        if (response.code === 0 && response.data?.user) {
          const user = response.data.user;
          return {
            success: true,
            result: {
              userId: user.user_id,
              openId: user.open_id,
              name: user.name,
              enName: user.en_name,
              email: user.email,
              mobile: user.mobile,
              status: user.status,
            },
          };
        }

        return {
          success: false,
          error: response.msg ?? "获取用户信息失败",
        };
      } catch (error) {
        logger.error("Failed to get user", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}
