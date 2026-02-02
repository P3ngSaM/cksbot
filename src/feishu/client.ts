/**
 * Feishu API client wrapper
 */

import * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuChannelConfig } from "../config/schema.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("feishu-client");

let clientInstance: lark.Client | null = null;

export interface FeishuClientOptions {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

/**
 * Create a Feishu client instance
 */
export function createFeishuClient(options: FeishuClientOptions): lark.Client {
  const client = new lark.Client({
    appId: options.appId,
    appSecret: options.appSecret,
    disableTokenCache: false,
  });

  logger.info("Feishu client created");
  return client;
}

/**
 * Get or create a singleton Feishu client
 */
export function getFeishuClient(config: FeishuChannelConfig): lark.Client {
  if (!clientInstance) {
    clientInstance = createFeishuClient({
      appId: config.appId,
      appSecret: config.appSecret,
      encryptKey: config.encryptKey,
      verificationToken: config.verificationToken,
    });
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetFeishuClient(): void {
  clientInstance = null;
}

/**
 * Get user info by user ID
 */
export async function getUserInfo(
  client: lark.Client,
  userId: string,
  userIdType: "open_id" | "union_id" | "user_id" = "open_id"
): Promise<{
  userId: string;
  name: string;
  email?: string;
  mobile?: string;
} | null> {
  try {
    const response = await client.contact.user.get({
      path: { user_id: userId },
      params: { user_id_type: userIdType },
    });

    if (response.data?.user) {
      const user = response.data.user;
      return {
        userId: user.user_id ?? userId,
        name: user.name ?? "Unknown",
        email: user.email,
        mobile: user.mobile,
      };
    }
    return null;
  } catch (error) {
    logger.error("Failed to get user info", { userId, error });
    return null;
  }
}

/**
 * Get chat info by chat ID
 */
export async function getChatInfo(
  client: lark.Client,
  chatId: string
): Promise<{
  chatId: string;
  name: string;
  chatType: string;
  memberCount: number;
} | null> {
  try {
    const response = await client.im.chat.get({
      path: { chat_id: chatId },
    });

    if (response.data) {
      const userCount = response.data.user_count;
      return {
        chatId,
        name: response.data.name ?? "Unknown",
        chatType: response.data.chat_mode ?? "unknown",
        memberCount: typeof userCount === "number" ? userCount : parseInt(String(userCount ?? "0"), 10),
      };
    }
    return null;
  } catch (error) {
    logger.error("Failed to get chat info", { chatId, error });
    return null;
  }
}
