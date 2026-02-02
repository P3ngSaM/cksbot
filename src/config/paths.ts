/**
 * Configuration path management
 */

import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR_NAME = ".cksbot";
const CONFIG_FILE_NAME = "config.json5";

export function getConfigDir(): string {
  return process.env["FEISHUPILOT_CONFIG_DIR"] ?? join(homedir(), CONFIG_DIR_NAME);
}

export function getConfigFilePath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

export function getPluginsDir(): string {
  return join(getConfigDir(), "plugins");
}

export function getLogsDir(): string {
  return join(getConfigDir(), "logs");
}

export function getCacheDir(): string {
  return join(getConfigDir(), "cache");
}
