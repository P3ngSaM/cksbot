/**
 * Feishu approval tools
 */

import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { getFeishuClient } from "../../feishu/client.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("approval-tools");

/**
 * Create approval tools
 */
export function createApprovalTools(): AgentTool[] {
  return [
    createCreateApprovalTool(),
  ];
}

/**
 * Create approval instance tool
 */
function createCreateApprovalTool(): AgentTool {
  return {
    name: "feishu_create_approval",
    description: "创建审批实例。发起一个新的审批流程。",
    inputSchema: {
      type: "object",
      properties: {
        approval_code: {
          type: "string",
          description: "审批定义code",
        },
        user_id: {
          type: "string",
          description: "发起人的user_id或open_id",
        },
        form: {
          type: "string",
          description: "审批表单数据，JSON格式字符串",
        },
      },
      required: ["approval_code", "user_id", "form"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const approvalCode = input["approval_code"] as string;
      const userId = input["user_id"] as string;
      const form = input["form"] as string;

      try {
        const client = getFeishuClient(feishuConfig);

        const response = await client.approval.instance.create({
          data: {
            approval_code: approvalCode,
            user_id: userId,
            form,
          },
        });

        if (response.code === 0 && response.data?.instance_code) {
          return {
            success: true,
            result: {
              instanceCode: response.data.instance_code,
              status: "created",
            },
          };
        }

        return {
          success: false,
          error: response.msg ?? "Failed to create approval",
        };
      } catch (error) {
        logger.error("Failed to create approval", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}
