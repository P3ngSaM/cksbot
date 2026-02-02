/**
 * Config CLI command
 */

import { Command } from "commander";
import { getConfigValue, initConfig, loadConfig, saveConfig, setConfigValue } from "../../config/index.js";
import { getConfigFilePath } from "../../config/paths.js";
import { logger } from "../../utils/logger.js";

export function createConfigCommand(): Command {
  const config = new Command("config").description("Manage configuration");

  config
    .command("init")
    .description("Initialize configuration file")
    .action(() => {
      try {
        initConfig();
        console.log(`Config file initialized at: ${getConfigFilePath()}`);
      } catch (error) {
        logger.error("Failed to initialize config", error);
        process.exit(1);
      }
    });

  config
    .command("path")
    .description("Show configuration file path")
    .action(() => {
      console.log(getConfigFilePath());
    });

  config
    .command("get")
    .description("Get a configuration value")
    .argument("[key]", "Configuration key (dot notation, e.g., agent.model)")
    .action((key?: string) => {
      try {
        const cfg = loadConfig();
        if (key) {
          const value = getConfigValue(cfg, key);
          if (value === undefined) {
            console.log(`Key "${key}" not found`);
          } else {
            console.log(JSON.stringify(value, null, 2));
          }
        } else {
          console.log(JSON.stringify(cfg, null, 2));
        }
      } catch (error) {
        logger.error("Failed to get config", error);
        process.exit(1);
      }
    });

  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Configuration key (dot notation)")
    .argument("<value>", "Value to set (JSON format)")
    .action((key: string, value: string) => {
      try {
        const cfg = loadConfig();
        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }
        const newConfig = setConfigValue(cfg, key, parsedValue);
        saveConfig(newConfig);
        console.log(`Set ${key} = ${JSON.stringify(parsedValue)}`);
      } catch (error) {
        logger.error("Failed to set config", error);
        process.exit(1);
      }
    });

  return config;
}
