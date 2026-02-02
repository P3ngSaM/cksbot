/**
 * Plugin registry
 */

import type { Config } from "../config/schema.js";
import type { Plugin, ChannelPlugin, ToolPlugin } from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("plugin-registry");

/**
 * Plugin registry singleton
 */
class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private channelPlugins = new Map<string, ChannelPlugin>();
  private toolPlugins = new Map<string, ToolPlugin>();
  private initialized = false;

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    const id = plugin.meta.id;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} is already registered`);
    }

    this.plugins.set(id, plugin);

    if (plugin.channel) {
      this.channelPlugins.set(plugin.channel.id, plugin.channel);
      logger.info(`Registered channel plugin: ${plugin.channel.id}`);
    }

    if (plugin.tools) {
      this.toolPlugins.set(plugin.tools.id, plugin.tools);
      logger.info(`Registered tool plugin: ${plugin.tools.id}`);
    }

    logger.info(`Registered plugin: ${id} v${plugin.meta.version}`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return;
    }

    // Call destroy if exists
    if (plugin.destroy) {
      await plugin.destroy();
    }

    // Remove from registries
    if (plugin.channel) {
      this.channelPlugins.delete(plugin.channel.id);
    }

    if (plugin.tools) {
      this.toolPlugins.delete(plugin.tools.id);
    }

    this.plugins.delete(id);
    logger.info(`Unregistered plugin: ${id}`);
  }

  /**
   * Initialize all plugins
   */
  async init(config: Config): Promise<void> {
    if (this.initialized) {
      return;
    }

    for (const plugin of this.plugins.values()) {
      if (plugin.init) {
        try {
          await plugin.init(config);
          logger.debug(`Initialized plugin: ${plugin.meta.id}`);
        } catch (error) {
          logger.error(`Failed to initialize plugin: ${plugin.meta.id}`, error);
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Destroy all plugins
   */
  async destroy(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        try {
          await plugin.destroy();
        } catch (error) {
          logger.error(`Failed to destroy plugin: ${plugin.meta.id}`, error);
        }
      }
    }

    this.plugins.clear();
    this.channelPlugins.clear();
    this.toolPlugins.clear();
    this.initialized = false;
  }

  /**
   * Get a plugin by ID
   */
  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get a channel plugin by ID
   */
  getChannel(id: string): ChannelPlugin | undefined {
    return this.channelPlugins.get(id);
  }

  /**
   * Get a tool plugin by ID
   */
  getTools(id: string): ToolPlugin | undefined {
    return this.toolPlugins.get(id);
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Get all channel plugins
   */
  getAllChannels(): ChannelPlugin[] {
    return [...this.channelPlugins.values()];
  }

  /**
   * Get all tool plugins
   */
  getAllTools(): ToolPlugin[] {
    return [...this.toolPlugins.values()];
  }

  /**
   * Check if a plugin is registered
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
