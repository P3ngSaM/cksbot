/**
 * Channel dock - manages channel lifecycle
 */

import type { Config } from "../config/schema.js";
import type { ChannelPlugin, ChannelContext, InboundMessage, MessageHandler } from "../plugins/types.js";
import {
  registerChannel,
  unregisterChannel,
  getChannel,
  getAllChannels,
  updateChannelStatus,
  isChannelRunning,
} from "./registry.js";
import { getOrCreateSession } from "./session.js";
import { runAgent } from "../agents/runner.js";
import { createDefaultTools } from "../agents/tools/common.js";
import { getSystemPrompt } from "../agents/system-prompt.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("channel-dock");

/**
 * Channel dock singleton
 */
class ChannelDock {
  private config: Config | null = null;
  private messageHandler: MessageHandler | null = null;

  /**
   * Initialize the dock with config
   */
  init(config: Config): void {
    this.config = config;
  }

  /**
   * Set custom message handler
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Add a channel plugin
   */
  addChannel(plugin: ChannelPlugin): void {
    registerChannel(plugin);
  }

  /**
   * Remove a channel plugin
   */
  removeChannel(id: string): void {
    unregisterChannel(id);
  }

  /**
   * Start a channel
   */
  async startChannel(id: string): Promise<void> {
    if (!this.config) {
      throw new Error("Dock not initialized");
    }

    const state = getChannel(id);
    if (!state) {
      throw new Error(`Channel not found: ${id}`);
    }

    if (isChannelRunning(id)) {
      logger.warn(`Channel ${id} is already running`);
      return;
    }

    updateChannelStatus(id, "starting");

    try {
      const context = this.createContext(state.plugin);
      await state.plugin.gateway.start(context);
      updateChannelStatus(id, "running");
      logger.info(`Started channel: ${id}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      updateChannelStatus(id, "error", errorMsg);
      logger.error(`Failed to start channel: ${id}`, error);
      throw error;
    }
  }

  /**
   * Stop a channel
   */
  async stopChannel(id: string): Promise<void> {
    const state = getChannel(id);
    if (!state) {
      throw new Error(`Channel not found: ${id}`);
    }

    if (state.status !== "running") {
      return;
    }

    updateChannelStatus(id, "stopping");

    try {
      if (state.plugin.gateway.stop) {
        await state.plugin.gateway.stop();
      }
      updateChannelStatus(id, "idle");
      logger.info(`Stopped channel: ${id}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      updateChannelStatus(id, "error", errorMsg);
      throw error;
    }
  }

  /**
   * Start all channels
   */
  async startAll(): Promise<void> {
    const channels = getAllChannels();
    for (const state of channels) {
      if (state.status === "idle") {
        try {
          await this.startChannel(state.plugin.id);
        } catch (error) {
          logger.error(`Failed to start channel: ${state.plugin.id}`, error);
        }
      }
    }
  }

  /**
   * Stop all channels
   */
  async stopAll(): Promise<void> {
    const channels = getAllChannels();
    for (const state of channels) {
      if (state.status === "running") {
        try {
          await this.stopChannel(state.plugin.id);
        } catch (error) {
          logger.error(`Failed to stop channel: ${state.plugin.id}`, error);
        }
      }
    }
  }

  /**
   * Create channel context
   */
  private createContext(plugin: ChannelPlugin): ChannelContext {
    const channelConfig = this.getChannelConfig(plugin.id);

    return {
      config: this.config!,
      channelConfig,
      onMessage: (handler) => {
        // Wrap handler with session and agent logic
        this.setupMessageHandler(plugin.id, handler);
      },
    };
  }

  /**
   * Get channel-specific config
   */
  private getChannelConfig(channelId: string): unknown {
    if (channelId === "feishu") {
      return this.config?.channels.feishu;
    }
    // Add more channels here as needed
    return undefined;
  }

  /**
   * Setup message handler with agent integration
   */
  private setupMessageHandler(channelId: string, pluginHandler: MessageHandler): void {
    const handler: MessageHandler = async (message) => {
      // Get or create session
      const session = getOrCreateSession(message);

      logger.debug("Received message", {
        channelId,
        chatId: message.chatId,
        sessionId: session.id,
      });

      // Use custom handler if set
      if (this.messageHandler) {
        await this.messageHandler(message);
        return;
      }

      // Default: run agent
      await this.runAgentForMessage(session.id, message);
    };

    // Call the plugin's handler setup
    pluginHandler(handler as never);
  }

  /**
   * Run agent for a message
   */
  private async runAgentForMessage(
    sessionId: string,
    message: InboundMessage
  ): Promise<void> {
    if (!this.config) {
      return;
    }

    try {
      const tools = await createDefaultTools(this.config);
      const systemPrompt = getSystemPrompt(this.config);

      const response = await runAgent({
        sessionId,
        tools,
        systemPrompt,
        userMessage: message.content,
        config: this.config,
        userId: message.senderId,
        chatId: message.chatId,
      });

      // Send response back through the channel
      const state = getChannel(message.channelId);
      if (state && state.plugin.outbound) {
        await state.plugin.outbound.sendText({
          to: message.chatId,
          text: response.content,
          replyTo: message.id,
        });
      }
    } catch (error) {
      logger.error("Failed to run agent", error);
    }
  }
}

// Export singleton
export const channelDock = new ChannelDock();
