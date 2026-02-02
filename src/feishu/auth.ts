/**
 * Feishu authentication and token management
 */

import * as lark from "@larksuiteoapi/node-sdk";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("feishu-auth");

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Get tenant access token
 * The lark SDK handles this internally, but we expose this for advanced use cases
 */
export async function getTenantAccessToken(
  client: lark.Client,
  appId: string
): Promise<string | null> {
  const cacheKey = `tenant:${appId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    // The SDK manages tokens internally, this is for reference
    // In practice, just use the client methods directly
    logger.debug("Token will be managed by SDK internally");
    return null;
  } catch (error) {
    logger.error("Failed to get tenant access token", error);
    return null;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  encryptKey: string
): boolean {
  // The lark SDK provides signature verification
  // This is a placeholder for custom verification if needed
  try {
    const crypto = require("crypto");
    const content = timestamp + nonce + encryptKey + body;
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return hash === signature;
  } catch (error) {
    logger.error("Failed to verify webhook signature", error);
    return false;
  }
}

/**
 * Decrypt encrypted event body
 */
export function decryptEventBody(
  encryptedBody: string,
  encryptKey: string
): string | null {
  try {
    const crypto = require("crypto");
    const key = crypto.createHash("sha256").update(encryptKey).digest();
    const encryptedBuffer = Buffer.from(encryptedBody, "base64");

    // First 16 bytes are IV
    const iv = encryptedBuffer.subarray(0, 16);
    const encrypted = encryptedBuffer.subarray(16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error("Failed to decrypt event body", error);
    return null;
  }
}

/**
 * Clear the token cache
 */
export function clearTokenCache(): void {
  tokenCache.clear();
  logger.debug("Token cache cleared");
}
