/**
 * Agent context tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getSession,
  addMessage,
  getMessages,
  setMetadata,
  getMetadata,
  clearSession,
  clearAllSessions,
  getAllSessionIds,
} from "../src/agents/context.js";

describe("SessionContext", () => {
  beforeEach(() => {
    clearAllSessions();
  });

  describe("getSession", () => {
    it("should create a new session if not exists", () => {
      const session = getSession("test-session");
      expect(session.sessionId).toBe("test-session");
      expect(session.messages).toHaveLength(0);
    });

    it("should return existing session", () => {
      const session1 = getSession("test-session");
      addMessage("test-session", { role: "user", content: "hello" });

      const session2 = getSession("test-session");
      expect(session2).toBe(session1);
      expect(session2.messages).toHaveLength(1);
    });
  });

  describe("addMessage", () => {
    it("should add message to session", () => {
      addMessage("test-session", { role: "user", content: "hello" });
      const messages = getMessages("test-session");
      expect(messages).toHaveLength(1);
      expect(messages[0]?.content).toBe("hello");
    });

    it("should add multiple messages", () => {
      addMessage("test-session", { role: "user", content: "hello" });
      addMessage("test-session", { role: "assistant", content: "hi there" });

      const messages = getMessages("test-session");
      expect(messages).toHaveLength(2);
    });
  });

  describe("getMessages", () => {
    it("should return empty array for new session", () => {
      const messages = getMessages("new-session");
      expect(messages).toHaveLength(0);
    });

    it("should return a copy of messages", () => {
      addMessage("test-session", { role: "user", content: "hello" });
      const messages = getMessages("test-session");
      messages.push({ role: "assistant", content: "modified" });

      const originalMessages = getMessages("test-session");
      expect(originalMessages).toHaveLength(1);
    });
  });

  describe("metadata", () => {
    it("should set and get metadata", () => {
      setMetadata("test-session", "key", "value");
      const value = getMetadata("test-session", "key");
      expect(value).toBe("value");
    });

    it("should return undefined for missing key", () => {
      getSession("test-session");
      const value = getMetadata("test-session", "missing");
      expect(value).toBeUndefined();
    });
  });

  describe("clearSession", () => {
    it("should clear a session", () => {
      addMessage("test-session", { role: "user", content: "hello" });
      clearSession("test-session");

      const messages = getMessages("test-session");
      expect(messages).toHaveLength(0);
    });
  });

  describe("getAllSessionIds", () => {
    it("should return all session IDs", () => {
      getSession("session-1");
      getSession("session-2");

      const ids = getAllSessionIds();
      expect(ids).toContain("session-1");
      expect(ids).toContain("session-2");
    });
  });
});
