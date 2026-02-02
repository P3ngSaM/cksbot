/**
 * Configuration I/O with JSON5 support and environment variable substitution
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import JSON5 from "json5";
import { Config, ConfigSchema, getDefaultConfig } from "./schema.js";
import { getConfigDir, getConfigFilePath } from "./paths.js";
import { logger } from "../utils/logger.js";

/**
 * Substitute environment variables in a string
 * Supports ${VAR_NAME} syntax
 */
export function substituteEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      logger.warn(`Environment variable ${varName} is not set`);
      return "";
    }
    return envValue;
  });
}

/**
 * Recursively substitute environment variables in an object
 */
function substituteEnvVarsInObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return substituteEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(substituteEnvVarsInObject);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVarsInObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Ensure the config directory exists
 */
export function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
    logger.info(`Created config directory: ${configDir}`);
  }
}

/**
 * Load configuration from file
 * Returns default config if file doesn't exist
 */
export function loadConfig(): Config {
  const configPath = getConfigFilePath();

  if (!existsSync(configPath)) {
    logger.debug(`Config file not found at ${configPath}, using defaults`);
    return getDefaultConfig();
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const rawConfig = JSON5.parse(content);
    const substitutedConfig = substituteEnvVarsInObject(rawConfig);
    const config = ConfigSchema.parse(substitutedConfig);
    logger.debug(`Loaded config from ${configPath}`);
    return config;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config): void {
  const configPath = getConfigFilePath();
  ensureConfigDir();

  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = JSON5.stringify(config, null, 2);
  writeFileSync(configPath, content, "utf-8");
  logger.info(`Saved config to ${configPath}`);
}

/**
 * Initialize config file with defaults if it doesn't exist
 */
export function initConfig(): Config {
  const configPath = getConfigFilePath();

  if (existsSync(configPath)) {
    logger.info(`Config file already exists at ${configPath}`);
    return loadConfig();
  }

  const defaultConfig = getDefaultConfig();

  // Create a template config with placeholder environment variables
  const templateConfig = {
    agent: {
      model: "claude-sonnet-4-5-20250929",
      maxTokens: 8192,
    },
    models: {
      anthropic: {
        apiKey: "${ANTHROPIC_API_KEY}",
        baseUrl: "https://claude.sssaicode.com/api", // Claude proxy service
        authType: "bearer", // Use Bearer token auth for proxy
      },
    },
    channels: {
      feishu: {
        appId: "${FEISHU_APP_ID}",
        appSecret: "${FEISHU_APP_SECRET}",
        mode: "websocket",
        dmPolicy: "pairing",
        requireMention: true,
      },
    },
    gateway: {
      port: 18789,
      host: "127.0.0.1",
    },
  };

  ensureConfigDir();
  const content = JSON5.stringify(templateConfig, null, 2);
  writeFileSync(configPath, content, "utf-8");
  logger.info(`Created config file at ${configPath}`);

  return defaultConfig;
}

/**
 * Get a specific config value by path (dot notation)
 */
export function getConfigValue(config: Config, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = config;

  for (const part of parts) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a specific config value by path (dot notation)
 */
export function setConfigValue(config: Config, path: string, value: unknown): Config {
  const parts = path.split(".");
  const result = JSON.parse(JSON.stringify(config)) as Config;
  let current: Record<string, unknown> = result as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;

  return ConfigSchema.parse(result);
}
