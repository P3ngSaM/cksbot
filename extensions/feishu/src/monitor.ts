/**
 * Feishu event monitor
 */

import type { FeishuChannelConfig } from "../../../src/config/schema.js";
import type { MessageHandler, CardActionHandler } from "../../../src/plugins/types.js";
import { createLogger } from "../../../src/utils/logger.js";

const logger = createLogger("feishu-monitor");

/**
 * Event statistics
 */
interface EventStats {
  messagesReceived: number;
  messagesProcessed: number;
  messagesFailed: number;
  cardActionsReceived: number;
  lastMessageAt?: Date;
  lastCardActionAt?: Date;
}

const stats: EventStats = {
  messagesReceived: 0,
  messagesProcessed: 0,
  messagesFailed: 0,
  cardActionsReceived: 0,
};

/**
 * Message handlers
 */
const messageHandlers: MessageHandler[] = [];
const cardActionHandlers: CardActionHandler[] = [];

/**
 * Register a message handler
 */
export function onMessage(handler: MessageHandler): void {
  messageHandlers.push(handler);
}

/**
 * Register a card action handler
 */
export function onCardAction(handler: CardActionHandler): void {
  cardActionHandlers.push(handler);
}

/**
 * Dispatch a message to all handlers
 */
export async function dispatchMessage(message: Parameters<MessageHandler>[0]): Promise<void> {
  stats.messagesReceived++;
  stats.lastMessageAt = new Date();

  for (const handler of messageHandlers) {
    try {
      await handler(message);
      stats.messagesProcessed++;
    } catch (error) {
      stats.messagesFailed++;
      logger.error("Message handler error", error);
    }
  }
}

/**
 * Dispatch a card action to all handlers
 */
export async function dispatchCardAction(
  event: Parameters<CardActionHandler>[0]
): Promise<void> {
  stats.cardActionsReceived++;
  stats.lastCardActionAt = new Date();

  for (const handler of cardActionHandlers) {
    try {
      await handler(event);
    } catch (error) {
      logger.error("Card action handler error", error);
    }
  }
}

/**
 * Get event statistics
 */
export function getStats(): EventStats {
  return { ...stats };
}

/**
 * Reset statistics
 */
export function resetStats(): void {
  stats.messagesReceived = 0;
  stats.messagesProcessed = 0;
  stats.messagesFailed = 0;
  stats.cardActionsReceived = 0;
  stats.lastMessageAt = undefined;
  stats.lastCardActionAt = undefined;
}

/**
 * Clear all handlers
 */
export function clearHandlers(): void {
  messageHandlers.length = 0;
  cardActionHandlers.length = 0;
}
