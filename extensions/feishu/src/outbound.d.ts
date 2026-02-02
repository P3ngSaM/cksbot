/**
 * Feishu outbound message handling
 */
import type * as lark from "@larksuiteoapi/node-sdk";
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
export declare function sendText(client: lark.Client, chatId: string, text: string, replyTo?: string): Promise<SendResult>;
/**
 * Send a card message
 */
export declare function sendCard(client: lark.Client, chatId: string, card: object, replyTo?: string): Promise<SendResult>;
/**
 * Send an image message
 */
export declare function sendImage(client: lark.Client, chatId: string, imageKey: string, replyTo?: string): Promise<SendResult>;
/**
 * Add a reaction to a message
 */
export declare function addReaction(client: lark.Client, messageId: string, emojiType: string): Promise<boolean>;
/**
 * Update a card message
 */
export declare function updateCard(client: lark.Client, messageId: string, card: object): Promise<boolean>;
//# sourceMappingURL=outbound.d.ts.map