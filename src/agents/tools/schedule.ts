/**
 * Schedule tools - 定时任务工具
 * 允许 Agent 创建和管理定时任务
 */

import type { AgentTool, ToolExecutionResult } from "./common.js";
import {
  createScheduledTask,
  getUserScheduledTasks,
  deleteScheduledTask,
  getAllScheduledTasks,
  addUserNote,
  getUserProfile,
  updateUserProfile,
  getAssistantIdentity,
  updateAssistantIdentity,
  getGlobalUserIdentity,
  updateGlobalUserIdentity,
} from "../memory.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("schedule-tools");

/**
 * Create schedule and memory tools
 */
export function createScheduleTools(): AgentTool[] {
  return [
    createScheduleMessageTool(),
    createListSchedulesTool(),
    createDeleteScheduleTool(),
    createRememberTool(),
    createRecallTool(),
    createSetIdentityTool(),
    createGetIdentityTool(),
  ];
}

/**
 * Schedule a message to be sent later
 */
function createScheduleMessageTool(): AgentTool {
  return {
    name: "schedule_message",
    description: `创建定时发送消息任务。
可以设置一次性发送或定期发送（每天、每周、每月）。

示例：
- 明天早上9点发送问候: executeAt="2026-02-01T09:00:00", repeat="once"
- 每天早上9点发送: repeat="daily"
- 每周一发送周报提醒: repeat="weekly"`,
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "要发送的消息内容",
        },
        executeAt: {
          type: "string",
          description: "执行时间，ISO 格式，如 2026-02-01T09:00:00",
        },
        repeat: {
          type: "string",
          enum: ["once", "daily", "weekly", "monthly"],
          description: "重复类型：once=一次性, daily=每天, weekly=每周, monthly=每月",
        },
      },
      required: ["message"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const message = input["message"] as string;
      const executeAt = input["executeAt"] as string | undefined;
      const repeat = (input["repeat"] as "once" | "daily" | "weekly" | "monthly") ?? "once";

      if (!context.userId || !context.chatId) {
        return {
          success: false,
          error: "无法获取用户信息，无法创建定时任务",
        };
      }

      try {
        const task = createScheduledTask({
          userId: context.userId,
          chatId: context.chatId,
          executeAt: executeAt ?? new Date(Date.now() + 60000).toISOString(), // 默认1分钟后
          repeat,
          action: {
            type: "send_message",
            content: message,
          },
          enabled: true,
        });

        logger.info("Created scheduled message", { taskId: task.id, userId: context.userId });

        return {
          success: true,
          result: {
            taskId: task.id,
            message: `已创建定时任务`,
            executeAt: task.executeAt,
            repeat: task.repeat,
            content: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          },
        };
      } catch (error: any) {
        logger.error("Failed to create scheduled task", { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * List scheduled tasks
 */
function createListSchedulesTool(): AgentTool {
  return {
    name: "list_schedules",
    description: "列出当前用户的所有定时任务",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      if (!context.userId) {
        return {
          success: false,
          error: "无法获取用户信息",
        };
      }

      const tasks = getUserScheduledTasks(context.userId);

      return {
        success: true,
        result: {
          tasks: tasks.map(t => ({
            id: t.id,
            content: t.action.content.substring(0, 50),
            executeAt: t.executeAt,
            repeat: t.repeat,
            enabled: t.enabled,
            lastRun: t.lastRun,
          })),
          total: tasks.length,
        },
      };
    },
  };
}

/**
 * Delete a scheduled task
 */
function createDeleteScheduleTool(): AgentTool {
  return {
    name: "delete_schedule",
    description: "删除一个定时任务",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "任务ID",
        },
      },
      required: ["taskId"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const taskId = input["taskId"] as string;

      const deleted = deleteScheduledTask(taskId);

      return {
        success: deleted,
        result: deleted ? { message: "任务已删除" } : undefined,
        error: deleted ? undefined : "任务不存在",
      };
    },
  };
}

/**
 * Remember information about user
 */
function createRememberTool(): AgentTool {
  return {
    name: "remember",
    description: `记住关于用户的重要信息。
当用户提到个人偏好、重要事项、习惯等信息时使用此工具记录。

示例：
- "用户喜欢吃火锅"
- "用户的生日是3月15日"
- "用户住在成都双流区"
- "用户的朋友谢杰的飞书账号是 xxx"`,
    inputSchema: {
      type: "object",
      properties: {
        note: {
          type: "string",
          description: "要记住的信息",
        },
        category: {
          type: "string",
          description: "信息类别（可选），如：preference, contact, event, personal",
        },
      },
      required: ["note"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      if (!context.userId) {
        return {
          success: false,
          error: "无法获取用户信息",
        };
      }

      const note = input["note"] as string;
      const category = input["category"] as string | undefined;

      const fullNote = category ? `[${category}] ${note}` : note;
      addUserNote(context.userId, fullNote);

      logger.info("Remembered user info", { userId: context.userId, note: note.substring(0, 50) });

      return {
        success: true,
        result: {
          message: "已记住",
          note: fullNote,
        },
      };
    },
  };
}

/**
 * Recall information about user
 */
function createRecallTool(): AgentTool {
  return {
    name: "recall",
    description: "回忆之前记住的用户信息",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "搜索关键词（可选），用于过滤记忆",
        },
      },
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      if (!context.userId) {
        return {
          success: false,
          error: "无法获取用户信息",
        };
      }

      const keyword = input["keyword"] as string | undefined;
      const profile = getUserProfile(context.userId);

      let notes = profile.notes ?? [];

      if (keyword) {
        notes = notes.filter(n => n.toLowerCase().includes(keyword.toLowerCase()));
      }

      return {
        success: true,
        result: {
          userName: profile.name,
          firstSeen: profile.firstSeen,
          notes: notes.slice(-20), // 返回最近20条
          totalNotes: profile.notes?.length ?? 0,
        },
      };
    },
  };
}

/**
 * Set identity (assistant name, user name)
 */
function createSetIdentityTool(): AgentTool {
  return {
    name: "set_identity",
    description: `设置身份信息。用于：
1. 当用户给你取名字时，设置你的名字（assistantName）
2. 当用户告诉你他们的名字时，设置用户名字（userName）

示例：
- 用户说"以后叫你小飞" → 设置 assistantName="小飞"
- 用户说"我叫小明" → 设置 userName="小明"
- 用户说"叫我小明，你叫小飞" → 同时设置两个`,
    inputSchema: {
      type: "object",
      properties: {
        assistantName: {
          type: "string",
          description: "新的助手名字（用户给你取的名字）",
        },
        assistantAvatar: {
          type: "string",
          description: "助手头像（单个字符或emoji）",
        },
        userName: {
          type: "string",
          description: "用户的名字",
        },
      },
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const assistantName = input["assistantName"] as string | undefined;
      const assistantAvatar = input["assistantAvatar"] as string | undefined;
      const userName = input["userName"] as string | undefined;

      const changes: string[] = [];

      if (assistantName) {
        updateAssistantIdentity({
          name: assistantName,
          avatar: assistantAvatar || assistantName.charAt(0).toUpperCase(),
        });
        changes.push(`助手名字设为"${assistantName}"`);
      }

      if (userName) {
        updateGlobalUserIdentity({ name: userName });
        changes.push(`用户名字设为"${userName}"`);
      }

      if (changes.length === 0) {
        return {
          success: false,
          error: "至少需要提供 assistantName 或 userName",
        };
      }

      logger.info("Updated identity", { assistantName, userName });

      return {
        success: true,
        result: {
          message: "身份已更新",
          changes,
        },
      };
    },
  };
}

/**
 * Get current identity
 */
function createGetIdentityTool(): AgentTool {
  return {
    name: "get_identity",
    description: "获取当前的身份信息（你的名字和用户的名字）。在对话开始时调用此工具了解你叫什么、用户叫什么。",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolExecutionResult> => {
      const assistant = getAssistantIdentity();
      const user = getGlobalUserIdentity();

      return {
        success: true,
        result: {
          assistantName: assistant.name,
          assistantAvatar: assistant.avatar,
          userName: user?.name || null,
          isNewUser: !user || !user.name,
        },
      };
    },
  };
}
