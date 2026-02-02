/**
 * Agent session context management
 * With persistent storage for chat history
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Message } from "./providers/anthropic.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("context");

const DATA_DIR = join(homedir(), ".cksbot", "data");
const SESSIONS_FILE = join(DATA_DIR, "sessions.json");

/**
 * Session context for maintaining conversation history
 */
export interface SessionContext {
  sessionId: string;
  messages: Message[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sessions storage format
 */
interface SessionsStore {
  sessions: Record<string, SessionContext>;
  version: number;
}

/**
 * Session store (in-memory cache)
 */
let sessionsCache: SessionsStore | null = null;

/**
 * Maximum messages to keep in history
 */
const MAX_HISTORY_LENGTH = 50;

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load sessions from disk
 */
function loadSessions(): SessionsStore {
  if (sessionsCache) return sessionsCache;

  ensureDataDir();

  if (existsSync(SESSIONS_FILE)) {
    try {
      const data = readFileSync(SESSIONS_FILE, "utf-8");
      sessionsCache = JSON.parse(data) as SessionsStore;
      logger.debug("Loaded sessions from disk", { count: Object.keys(sessionsCache.sessions).length });
    } catch (error) {
      logger.error("Failed to load sessions", error);
      sessionsCache = { sessions: {}, version: 1 };
    }
  } else {
    sessionsCache = { sessions: {}, version: 1 };
  }

  return sessionsCache;
}

/**
 * Save sessions to disk
 */
function saveSessions(): void {
  if (!sessionsCache) return;

  ensureDataDir();
  try {
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsCache, null, 2), "utf-8");
    logger.debug("Saved sessions to disk");
  } catch (error) {
    logger.error("Failed to save sessions", error);
  }
}

/**
 * Get or create a session
 */
export function getSession(sessionId: string): SessionContext {
  const store = loadSessions();
  let session = store.sessions[sessionId];

  if (!session) {
    const now = new Date().toISOString();
    session = {
      sessionId,
      messages: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    store.sessions[sessionId] = session;
    saveSessions();
    logger.debug("Created new session", { sessionId });
  }

  return session;
}

/**
 * Add a message to the session
 */
export function addMessage(sessionId: string, message: Message): void {
  const store = loadSessions();
  const session = getSession(sessionId);
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();

  // Trim history if too long
  if (session.messages.length > MAX_HISTORY_LENGTH) {
    session.messages = session.messages.slice(-MAX_HISTORY_LENGTH);
    logger.debug("Trimmed session history", { sessionId });
  }

  store.sessions[sessionId] = session;
  saveSessions();
}

/**
 * Get messages from a session
 */
export function getMessages(sessionId: string): Message[] {
  const session = getSession(sessionId);
  return [...session.messages];
}

/**
 * Set session metadata
 */
export function setMetadata(sessionId: string, key: string, value: unknown): void {
  const store = loadSessions();
  const session = getSession(sessionId);
  session.metadata[key] = value;
  session.updatedAt = new Date().toISOString();
  store.sessions[sessionId] = session;
  saveSessions();
}

/**
 * Get session metadata
 */
export function getMetadata(sessionId: string, key: string): unknown {
  const session = getSession(sessionId);
  return session.metadata[key];
}

/**
 * Clear a session
 */
export function clearSession(sessionId: string): void {
  const store = loadSessions();
  delete store.sessions[sessionId];
  saveSessions();
  logger.debug("Cleared session", { sessionId });
}

/**
 * Clear all sessions
 */
export function clearAllSessions(): void {
  const store = loadSessions();
  store.sessions = {};
  saveSessions();
  logger.debug("Cleared all sessions");
}

/**
 * Get all session IDs
 */
export function getAllSessionIds(): string[] {
  const store = loadSessions();
  return Object.keys(store.sessions);
}

/**
 * Get chat history for UI display (simplified format)
 */
export function getChatHistory(sessionId: string): Array<{ role: string; content: string }> {
  const messages = getMessages(sessionId);
  return messages
    .filter(m => typeof m.content === "string") // Only include simple text messages
    .map(m => ({
      role: m.role,
      content: m.content as string,
    }));
}

/**
 * Clean up old sessions (older than maxAge milliseconds)
 */
export function cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
  const store = loadSessions();
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of Object.entries(store.sessions)) {
    if (now - new Date(session.updatedAt).getTime() > maxAge) {
      delete store.sessions[sessionId];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    saveSessions();
    logger.info("Cleaned up old sessions", { count: cleaned });
  }

  return cleaned;
}

/**
 * Conversation summary for list display
 */
export interface ConversationSummary {
  sessionId: string;
  title: string;  // 第一条用户消息或默认标题
  preview: string;  // 最后一条消息预览
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all conversations for the web UI
 * Returns summaries sorted by updatedAt (newest first)
 */
export function getAllConversations(): ConversationSummary[] {
  const store = loadSessions();
  const conversations: ConversationSummary[] = [];

  for (const [sessionId, session] of Object.entries(store.sessions)) {
    // 只返回 web-chat 开头的对话（UI 对话）
    if (!sessionId.startsWith("web-chat")) continue;

    const messages = session.messages.filter(m => typeof m.content === "string");
    if (messages.length === 0) continue;

    // 标题：第一条用户消息的前 30 个字符
    const firstUserMsg = messages.find(m => m.role === "user");
    const title = firstUserMsg
      ? (firstUserMsg.content as string).substring(0, 30) + ((firstUserMsg.content as string).length > 30 ? "..." : "")
      : "新对话";

    // 预览：最后一条消息
    const lastMsg = messages[messages.length - 1];
    const preview = lastMsg
      ? (lastMsg.content as string).substring(0, 50) + ((lastMsg.content as string).length > 50 ? "..." : "")
      : "";

    conversations.push({
      sessionId,
      title,
      preview,
      messageCount: messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  // 按更新时间倒序
  conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return conversations;
}

/**
 * Create a new conversation session
 */
export function createConversation(): string {
  const sessionId = `web-chat-${Date.now()}`;
  getSession(sessionId); // 创建空会话
  return sessionId;
}
