/**
 * Channel session management
 */

import type { InboundMessage } from "../plugins/types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("session");

/**
 * Channel session
 */
export interface ChannelSession {
  id: string;
  channelId: string;
  chatId: string;
  chatType: "direct" | "group";
  userId?: string;
  userName?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Session store
 */
const sessions = new Map<string, ChannelSession>();

/**
 * Generate session ID from channel and chat
 */
export function generateSessionId(channelId: string, chatId: string): string {
  return `${channelId}:${chatId}`;
}

/**
 * Get or create a session
 */
export function getOrCreateSession(message: InboundMessage): ChannelSession {
  const sessionId = generateSessionId(message.channelId, message.chatId);
  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      channelId: message.channelId,
      chatId: message.chatId,
      chatType: message.chatType,
      userId: message.senderId,
      userName: message.senderName,
      metadata: {},
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };
    sessions.set(sessionId, session);
    logger.debug("Created new session", { sessionId });
  } else {
    session.lastActivityAt = new Date();
  }

  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): ChannelSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Get session by channel and chat ID
 */
export function getSessionByChatId(channelId: string, chatId: string): ChannelSession | undefined {
  return sessions.get(generateSessionId(channelId, chatId));
}

/**
 * Update session metadata
 */
export function updateSessionMetadata(
  sessionId: string,
  key: string,
  value: unknown
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.metadata[key] = value;
    session.lastActivityAt = new Date();
  }
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
  logger.debug("Deleted session", { sessionId });
}

/**
 * Get all sessions
 */
export function getAllSessions(): ChannelSession[] {
  return [...sessions.values()];
}

/**
 * Get sessions by channel
 */
export function getSessionsByChannel(channelId: string): ChannelSession[] {
  return [...sessions.values()].filter((s) => s.channelId === channelId);
}

/**
 * Clean up inactive sessions
 */
export function cleanupInactiveSessions(maxIdleMs: number = 24 * 60 * 60 * 1000): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivityAt.getTime() > maxIdleMs) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info("Cleaned up inactive sessions", { count: cleaned });
  }

  return cleaned;
}
