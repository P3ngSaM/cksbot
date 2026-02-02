/**
 * Channel session tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSessionId,
  getOrCreateSession,
  getSession,
  getSessionByChatId,
  updateSessionMetadata,
  deleteSession,
  getAllSessions,
  getSessionsByChannel,
  cleanupInactiveSessions,
} from "../src/channels/session.js";
import type { InboundMessage } from "../src/plugins/types.js";

describe("Channel Session", () => {
  const createMessage = (overrides?: Partial<InboundMessage>): InboundMessage => ({
    id: "msg-1",
    channelId: "feishu",
    chatId: "chat-1",
    chatType: "direct",
    senderId: "user-1",
    content: "hello",
    contentType: "text",
    timestamp: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    // Clean up all sessions
    const sessions = getAllSessions();
    for (const session of sessions) {
      deleteSession(session.id);
    }
  });

  describe("generateSessionId", () => {
    it("should generate consistent session IDs", () => {
      const id1 = generateSessionId("feishu", "chat-1");
      const id2 = generateSessionId("feishu", "chat-1");
      expect(id1).toBe(id2);
      expect(id1).toBe("feishu:chat-1");
    });

    it("should generate different IDs for different channels", () => {
      const id1 = generateSessionId("feishu", "chat-1");
      const id2 = generateSessionId("slack", "chat-1");
      expect(id1).not.toBe(id2);
    });
  });

  describe("getOrCreateSession", () => {
    it("should create a new session", () => {
      const message = createMessage();
      const session = getOrCreateSession(message);

      expect(session.id).toBe("feishu:chat-1");
      expect(session.channelId).toBe("feishu");
      expect(session.chatId).toBe("chat-1");
      expect(session.chatType).toBe("direct");
    });

    it("should return existing session", () => {
      const message = createMessage();
      const session1 = getOrCreateSession(message);
      const session2 = getOrCreateSession(message);

      expect(session1).toBe(session2);
    });

    it("should update lastActivityAt on access", () => {
      const message = createMessage();
      const session1 = getOrCreateSession(message);
      const firstActivity = session1.lastActivityAt;

      // Wait a bit
      const session2 = getOrCreateSession(message);
      expect(session2.lastActivityAt.getTime()).toBeGreaterThanOrEqual(
        firstActivity.getTime()
      );
    });
  });

  describe("getSession", () => {
    it("should return undefined for unknown session", () => {
      const session = getSession("unknown:session");
      expect(session).toBeUndefined();
    });
  });

  describe("getSessionByChatId", () => {
    it("should find session by channel and chat ID", () => {
      const message = createMessage();
      getOrCreateSession(message);

      const session = getSessionByChatId("feishu", "chat-1");
      expect(session).toBeDefined();
      expect(session?.chatId).toBe("chat-1");
    });
  });

  describe("updateSessionMetadata", () => {
    it("should update session metadata", () => {
      const message = createMessage();
      const session = getOrCreateSession(message);

      updateSessionMetadata(session.id, "key", "value");
      expect(session.metadata["key"]).toBe("value");
    });
  });

  describe("deleteSession", () => {
    it("should delete a session", () => {
      const message = createMessage();
      getOrCreateSession(message);

      deleteSession("feishu:chat-1");
      expect(getSession("feishu:chat-1")).toBeUndefined();
    });
  });

  describe("getSessionsByChannel", () => {
    it("should filter sessions by channel", () => {
      getOrCreateSession(createMessage({ channelId: "feishu", chatId: "chat-1" }));
      getOrCreateSession(createMessage({ channelId: "feishu", chatId: "chat-2" }));
      getOrCreateSession(createMessage({ channelId: "slack", chatId: "chat-3" }));

      const feishuSessions = getSessionsByChannel("feishu");
      expect(feishuSessions).toHaveLength(2);
    });
  });

  describe("cleanupInactiveSessions", () => {
    it("should remove inactive sessions", () => {
      const message = createMessage();
      const session = getOrCreateSession(message);

      // Set last activity to the past
      session.lastActivityAt = new Date(Date.now() - 1000);

      const cleaned = cleanupInactiveSessions(100); // 100ms max idle
      expect(cleaned).toBe(1);
      expect(getSession(session.id)).toBeUndefined();
    });
  });
});
