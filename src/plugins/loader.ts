/**
 * Plugin loader
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin, PluginFactory } from "./types.js";
import { pluginRegistry } from "./registry.js";
import { getPluginsDir } from "../config/paths.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("plugin-loader");

/**
 * Load a plugin from a path
 */
export async function loadPlugin(pluginPath: string): Promise<Plugin | null> {
  try {
    // Convert to file URL for ESM import
    const url = pathToFileURL(pluginPath).href;
    const module = await import(url);

    // Check for default export
    const factory: PluginFactory = module.default ?? module.plugin ?? module.createPlugin;

    if (typeof factory !== "function") {
      logger.error(`Plugin at ${pluginPath} does not export a factory function`);
      return null;
    }

    const plugin = await factory();
    await pluginRegistry.register(plugin);

    return plugin;
  } catch (error) {
    logger.error(`Failed to load plugin from ${pluginPath}`, error);
    return null;
  }
}

/**
 * Load all plugins from the plugins directory
 */
export async function loadPluginsFromDirectory(dir?: string): Promise<Plugin[]> {
  const pluginsDir = dir ?? getPluginsDir();
  const plugins: Plugin[] = [];

  if (!existsSync(pluginsDir)) {
    logger.debug(`Plugins directory does not exist: ${pluginsDir}`);
    return plugins;
  }

  const entries = readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const pluginDir = join(pluginsDir, entry.name);
    const indexPath = join(pluginDir, "index.js");
    const distIndexPath = join(pluginDir, "dist", "index.js");

    let pluginPath: string | null = null;

    if (existsSync(indexPath)) {
      pluginPath = indexPath;
    } else if (existsSync(distIndexPath)) {
      pluginPath = distIndexPath;
    }

    if (pluginPath) {
      const plugin = await loadPlugin(pluginPath);
      if (plugin) {
        plugins.push(plugin);
      }
    } else {
      logger.warn(`No entry point found for plugin: ${entry.name}`);
    }
  }

  logger.info(`Loaded ${plugins.length} plugins from ${pluginsDir}`);
  return plugins;
}

/**
 * Load built-in plugins
 */
export async function loadBuiltinPlugins(): Promise<Plugin[]> {
  const plugins: Plugin[] = [];

  // The Feishu plugin is built-in
  try {
    const { feishuPlugin } = await import("../../extensions/feishu/index.js");
    if (feishuPlugin) {
      await pluginRegistry.register(feishuPlugin);
      plugins.push(feishuPlugin);
      logger.info("Loaded built-in Feishu plugin");
    }
  } catch (error) {
    // Feishu plugin might not be built yet
    logger.debug("Built-in Feishu plugin not available", error);
  }

  return plugins;
}

/**
 * Load all plugins (built-in + user plugins)
 */
export async function loadAllPlugins(): Promise<Plugin[]> {
  const builtinPlugins = await loadBuiltinPlugins();
  const userPlugins = await loadPluginsFromDirectory();
  return [...builtinPlugins, ...userPlugins];
}
