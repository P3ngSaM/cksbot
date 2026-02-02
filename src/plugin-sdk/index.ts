/**
 * FeishuPilot Plugin SDK
 *
 * This module exports everything needed to develop plugins for FeishuPilot.
 */

// Plugin types
export type {
  Plugin,
  PluginMeta,
  PluginFactory,
  ChannelPlugin,
  ChannelCapabilities,
  ChannelGateway,
  ChannelOutbound,
  ChannelContext,
  ToolPlugin,
  InboundMessage,
  MessageHandler,
  CardActionEvent,
  CardActionHandler,
} from "../plugins/types.js";

// Tool types
export type {
  AgentTool,
  ToolContext,
  ToolExecutionResult,
} from "../agents/tools/common.js";

// Config types
export type {
  Config,
  AgentConfig,
  ModelsConfig,
  FeishuChannelConfig,
  ChannelsConfig,
  GatewayConfig,
} from "../config/schema.js";

// Logger
export { logger, createLogger, setLogLevel } from "../utils/logger.js";

/**
 * Helper to create a plugin
 */
export function definePlugin(plugin: {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  channel?: import("../plugins/types.js").ChannelPlugin;
  tools?: import("../plugins/types.js").ToolPlugin;
  init?: (config: import("../config/schema.js").Config) => Promise<void>;
  destroy?: () => Promise<void>;
}): import("../plugins/types.js").Plugin {
  return {
    meta: {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
    },
    channel: plugin.channel,
    tools: plugin.tools,
    init: plugin.init,
    destroy: plugin.destroy,
  };
}

/**
 * Helper to create a tool
 */
export function defineTool(tool: {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (
    input: Record<string, unknown>,
    context: import("../agents/tools/common.js").ToolContext
  ) => Promise<import("../agents/tools/common.js").ToolExecutionResult>;
}): import("../agents/tools/common.js").AgentTool {
  return tool;
}
