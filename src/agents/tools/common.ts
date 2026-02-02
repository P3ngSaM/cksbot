/**
 * Tool system base definitions
 */

import type { Config } from "../../config/schema.js";
import type { ToolDefinition } from "../providers/anthropic.js";
import { createLogger } from "../../utils/logger.js";
import { isSkillEnabled } from "../skills.js";

const logger = createLogger("tools");

/**
 * Tool execution context
 */
export interface ToolContext {
  sessionId: string;
  userId?: string;
  chatId?: string;
  config: Config;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Agent tool interface
 */
export interface AgentTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolExecutionResult>;
}

/**
 * Tool registry
 */
const toolRegistry = new Map<string, AgentTool>();

/**
 * Register a tool
 */
export function registerTool(tool: AgentTool): void {
  toolRegistry.set(tool.name, tool);
  logger.debug("Registered tool", { name: tool.name });
}

/**
 * Get a tool by name
 */
export function getTool(name: string): AgentTool | undefined {
  return toolRegistry.get(name);
}

/**
 * Get all registered tools
 */
export function getAllTools(): AgentTool[] {
  return [...toolRegistry.values()];
}

/**
 * Convert AgentTool to Claude ToolDefinition
 */
export function toToolDefinition(tool: AgentTool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  };
}

/**
 * Convert all tools to Claude ToolDefinitions
 */
export function toToolDefinitions(tools: AgentTool[]): ToolDefinition[] {
  return tools.map(toToolDefinition);
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const tool = getTool(name);
  if (!tool) {
    return {
      success: false,
      error: `Tool not found: ${name}`,
    };
  }

  try {
    logger.debug("Executing tool", { name, input });
    const result = await tool.execute(input, context);
    logger.debug("Tool execution complete", { name, success: result.success });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Tool execution failed", { name, error: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create default tools for the agent
 * Filters tools based on skill enablement
 */
export async function createDefaultTools(config: Config): Promise<AgentTool[]> {
  const allTools: AgentTool[] = [];

  // 优先加载计算机操作工具 - 核心能力
  try {
    const { createComputerTools } = await import("./computer.js");
    allTools.push(...createComputerTools());
    logger.info("Loaded computer tools (shell, file operations)");
  } catch (error) {
    logger.error("Failed to load computer tools", error);
  }

  // 加载 macOS 自动化工具
  try {
    const { createMacOSTools } = await import("./macos.js");
    allTools.push(...createMacOSTools());
    logger.info("Loaded macOS automation tools (applescript, open_app, etc)");
  } catch (error) {
    logger.error("Failed to load macOS tools", error);
  }

  // 加载视觉工具 (截图)
  try {
    const { createVisionTools } = await import("./vision.js");
    allTools.push(...createVisionTools());
    logger.info("Loaded vision tools (screenshot)");
  } catch (error) {
    logger.error("Failed to load vision tools", error);
  }

  // 加载定时任务和记忆工具
  try {
    const { createScheduleTools } = await import("./schedule.js");
    allTools.push(...createScheduleTools());
    logger.info("Loaded schedule and memory tools");
  } catch (error) {
    logger.error("Failed to load schedule tools", error);
  }

  // 加载网络搜索工具
  try {
    const { createWebSearchTools } = await import("./web-search.js");
    allTools.push(...createWebSearchTools());
    logger.info("Loaded web search tools (UAPI Pro Search + fallback)");
  } catch (error) {
    logger.error("Failed to load web search tools", error);
  }

  // 加载邮箱工具
  try {
    const { createEmailTools } = await import("./email.js");
    allTools.push(...createEmailTools());
    logger.info("Loaded email tools (SMTP)");
  } catch (error) {
    logger.error("Failed to load email tools", error);
  }

  // Load Feishu tools if configured
  // NOTE: 只加载日历、审批、文档工具
  // 不加载 contact (feishu_search_user) 和 messaging (feishu_send_message) 工具
  // 因为这些会干扰 macOS 自动化发送消息的流程
  // Agent 应该使用 open_app + key_press + type_text 来发送消息
  if (config.channels.feishu) {
    try {
      const { createCalendarTools } = await import("./calendar.js");
      const { createApprovalTools } = await import("./approval.js");
      const { createDocsTools } = await import("./docs.js");
      // 不加载 contact 和 messaging 工具，让 agent 使用 macOS 自动化
      // const { createMessagingTools } = await import("./messaging.js");
      // const { createContactTools } = await import("./contact.js");

      // allTools.push(...createContactTools()); // 禁用
      // allTools.push(...createMessagingTools()); // 禁用
      allTools.push(...createCalendarTools());
      allTools.push(...createApprovalTools());
      allTools.push(...createDocsTools());
      logger.info("Loaded Feishu tools (calendar, approval, docs only - messaging via macOS automation)");
    } catch (error) {
      logger.warn("Failed to load some Feishu tools", error);
    }
  }

  // Filter tools based on skill enablement
  const enabledTools = allTools.filter(tool => {
    const enabled = isSkillEnabled(tool.name);
    if (!enabled) {
      logger.debug(`Skill disabled, skipping tool: ${tool.name}`);
    }
    return enabled;
  });

  // Register all enabled tools
  for (const tool of enabledTools) {
    registerTool(tool);
  }

  // Log all enabled tool names for debugging
  const toolNames = enabledTools.map(t => t.name);
  logger.info(`Total tools loaded: ${enabledTools.length}/${allTools.length} (filtered by skills)`);
  logger.info(`Enabled tools: ${toolNames.join(", ")}`);

  return enabledTools;
}
