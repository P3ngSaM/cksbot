/**
 * Scheduler - 定时任务执行器
 * 定期检查并执行到期的任务
 */

import { getDueScheduledTasks, markTaskExecuted, type ScheduledTask } from "../agents/memory.js";
import { getFeishuClient } from "../feishu/client.js";
import { sendTextMessage } from "../feishu/messages.js";
import type { Config } from "../config/schema.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("scheduler");

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * 执行单个任务
 */
async function executeTask(task: ScheduledTask, config: Config): Promise<void> {
  logger.info("Executing scheduled task", { taskId: task.id, type: task.action.type });

  try {
    if (task.action.type === "send_message") {
      // 发送飞书消息
      const feishuConfig = config.channels.feishu;
      if (feishuConfig) {
        const client = getFeishuClient(feishuConfig);
        await sendTextMessage(client, task.chatId, task.action.content, "chat_id");
        logger.info("Scheduled message sent", { taskId: task.id, chatId: task.chatId });
      } else {
        logger.error("Feishu not configured, cannot send scheduled message");
      }
    } else if (task.action.type === "run_agent") {
      // TODO: 运行 agent 执行复杂任务
      logger.warn("run_agent task type not implemented yet");
    }

    // 标记任务已执行
    markTaskExecuted(task.id);

  } catch (error: any) {
    logger.error("Failed to execute scheduled task", { taskId: task.id, error: error.message });
  }
}

/**
 * 检查并执行到期任务
 */
async function checkAndExecuteTasks(config: Config): Promise<void> {
  const dueTasks = getDueScheduledTasks();

  if (dueTasks.length > 0) {
    logger.debug("Found due tasks", { count: dueTasks.length });

    for (const task of dueTasks) {
      await executeTask(task, config);
    }
  }
}

/**
 * 启动定时任务调度器
 */
export function startScheduler(config: Config, intervalMs: number = 60000): void {
  if (schedulerInterval) {
    logger.warn("Scheduler already running");
    return;
  }

  logger.info("Starting scheduler", { intervalMs });

  // 立即执行一次
  checkAndExecuteTasks(config).catch(err => {
    logger.error("Scheduler check failed", err);
  });

  // 定期执行
  schedulerInterval = setInterval(() => {
    checkAndExecuteTasks(config).catch(err => {
      logger.error("Scheduler check failed", err);
    });
  }, intervalMs);
}

/**
 * 停止定时任务调度器
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info("Scheduler stopped");
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): { running: boolean; nextCheck?: number } {
  return {
    running: schedulerInterval !== null,
  };
}
