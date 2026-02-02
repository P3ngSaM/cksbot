/**
 * Tool system tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerTool,
  getTool,
  getAllTools,
  toToolDefinition,
  toToolDefinitions,
  executeTool,
  type AgentTool,
  type ToolContext,
} from "../src/agents/tools/common.js";
import { getDefaultConfig } from "../src/config/index.js";

describe("Tool System", () => {
  const mockTool: AgentTool = {
    name: "test_tool",
    description: "A test tool",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Test input" },
      },
      required: ["input"],
    },
    execute: async (input, _context) => {
      return {
        success: true,
        result: { echo: input["input"] },
      };
    },
  };

  const errorTool: AgentTool = {
    name: "error_tool",
    description: "A tool that fails",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      throw new Error("Tool error");
    },
  };

  beforeEach(() => {
    // Clear registry by re-registering
  });

  describe("registerTool", () => {
    it("should register a tool", () => {
      registerTool(mockTool);
      const tool = getTool("test_tool");
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("test_tool");
    });
  });

  describe("getTool", () => {
    it("should return undefined for unknown tool", () => {
      const tool = getTool("unknown_tool");
      expect(tool).toBeUndefined();
    });
  });

  describe("getAllTools", () => {
    it("should return all registered tools", () => {
      registerTool(mockTool);
      const tools = getAllTools();
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe("toToolDefinition", () => {
    it("should convert to Claude tool definition format", () => {
      const definition = toToolDefinition(mockTool);
      expect(definition.name).toBe("test_tool");
      expect(definition.description).toBe("A test tool");
      expect(definition.input_schema.type).toBe("object");
    });
  });

  describe("toToolDefinitions", () => {
    it("should convert multiple tools", () => {
      const definitions = toToolDefinitions([mockTool, errorTool]);
      expect(definitions).toHaveLength(2);
    });
  });

  describe("executeTool", () => {
    const context: ToolContext = {
      sessionId: "test-session",
      config: getDefaultConfig(),
    };

    it("should execute a tool successfully", async () => {
      registerTool(mockTool);
      const result = await executeTool(
        "test_tool",
        { input: "hello" },
        context
      );
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ echo: "hello" });
    });

    it("should handle tool not found", async () => {
      const result = await executeTool("nonexistent", {}, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle tool execution error", async () => {
      registerTool(errorTool);
      const result = await executeTool("error_tool", {}, context);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tool error");
    });
  });
});
