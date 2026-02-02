/**
 * Plugin system types
 */

import type { Config } from "../config/schema.js";
import type { AgentTool } from "../agents/tools/common.js";

/**
 * Plugin metadata
 */
export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
}

/**
 * Channel capabilities
 */
export interface ChannelCapabilities {
  chatTypes: ("direct" | "group")[];
  reactions?: boolean;
  threads?: boolean;
  media?: boolean;
  cards?: boolean;
}

/**
 * Channel plugin gateway interface
 */
export interface ChannelGateway {
  /**
   * Start listening on this channel
   */
  start: (ctx: ChannelContext) => Promise<void>;

  /**
   * Stop listening
   */
  stop?: () => Promise<void>;
}

/**
 * Channel outbound interface
 */
export interface ChannelOutbound {
  /**
   * Send a text message
   */
  sendText: (params: {
    to: string;
    text: string;
    replyTo?: string;
  }) => Promise<{ messageId: string }>;

  /**
   * Send a card/rich message
   */
  sendCard?: (params: {
    to: string;
    card: unknown;
    replyTo?: string;
  }) => Promise<{ messageId: string }>;

  /**
   * Add a reaction to a message
   */
  addReaction?: (params: {
    messageId: string;
    reaction: string;
  }) => Promise<void>;
}

/**
 * Channel context passed to plugin
 */
export interface ChannelContext {
  config: Config;
  channelConfig: unknown;
  onMessage: (handler: MessageHandler) => void;
  onCardAction?: (handler: CardActionHandler) => void;
}

/**
 * Inbound message
 */
export interface InboundMessage {
  id: string;
  channelId: string;
  chatId: string;
  chatType: "direct" | "group";
  senderId: string;
  senderName?: string;
  content: string;
  contentType: "text" | "image" | "file" | "card";
  mentions?: Array<{ id: string; name: string }>;
  replyTo?: string;
  threadId?: string;
  timestamp: Date;
  raw?: unknown;
}

/**
 * Message handler type
 */
export type MessageHandler = (message: InboundMessage) => Promise<void> | void;

/**
 * Card action event
 */
export interface CardActionEvent {
  messageId: string;
  chatId: string;
  operatorId: string;
  action: {
    tag: string;
    value: Record<string, unknown>;
  };
}

/**
 * Card action handler type
 */
export type CardActionHandler = (event: CardActionEvent) => Promise<void> | void;

/**
 * Channel plugin interface
 */
export interface ChannelPlugin {
  id: string;
  capabilities: ChannelCapabilities;
  gateway: ChannelGateway;
  outbound: ChannelOutbound;
}

/**
 * Tool plugin interface
 */
export interface ToolPlugin {
  id: string;
  tools: AgentTool[];
}

/**
 * Generic plugin interface
 */
export interface Plugin {
  meta: PluginMeta;
  channel?: ChannelPlugin;
  tools?: ToolPlugin;

  /**
   * Initialize plugin
   */
  init?: (config: Config) => Promise<void>;

  /**
   * Cleanup plugin
   */
  destroy?: () => Promise<void>;
}

/**
 * Plugin factory function
 */
export type PluginFactory = () => Plugin | Promise<Plugin>;
