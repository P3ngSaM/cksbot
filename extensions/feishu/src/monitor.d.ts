/**
 * Feishu event monitor
 */
import type { MessageHandler, CardActionHandler } from "../../../src/plugins/types.js";
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
/**
 * Register a message handler
 */
export declare function onMessage(handler: MessageHandler): void;
/**
 * Register a card action handler
 */
export declare function onCardAction(handler: CardActionHandler): void;
/**
 * Dispatch a message to all handlers
 */
export declare function dispatchMessage(message: Parameters<MessageHandler>[0]): Promise<void>;
/**
 * Dispatch a card action to all handlers
 */
export declare function dispatchCardAction(event: Parameters<CardActionHandler>[0]): Promise<void>;
/**
 * Get event statistics
 */
export declare function getStats(): EventStats;
/**
 * Reset statistics
 */
export declare function resetStats(): void;
/**
 * Clear all handlers
 */
export declare function clearHandlers(): void;
export {};
//# sourceMappingURL=monitor.d.ts.map