/**
 * Gateway CLI command
 */

import { Command } from "commander";
import { loadConfig } from "../../config/index.js";
import { logger, setLogLevel } from "../../utils/logger.js";

export function createGatewayCommand(): Command {
  const gateway = new Command("gateway").description("Manage the gateway server");

  gateway
    .command("run")
    .description("Start the gateway server")
    .option("-p, --port <port>", "Port to listen on")
    .option("-h, --host <host>", "Host to bind to")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (options: { port?: string; host?: string; verbose?: boolean }) => {
      if (options.verbose) {
        setLogLevel("debug");
      }

      try {
        const config = loadConfig();
        const port = options.port ? parseInt(options.port, 10) : config.gateway.port;
        const host = options.host ?? config.gateway.host;

        logger.info(`Starting gateway server on ${host}:${port}`);

        // Dynamic import to avoid loading gateway code when not needed
        const { startGateway } = await import("../../gateway/server.js");
        await startGateway({ port, host, config });
      } catch (error) {
        logger.error("Failed to start gateway", error);
        process.exit(1);
      }
    });

  gateway
    .command("status")
    .description("Check gateway server status")
    .action(async () => {
      try {
        const config = loadConfig();
        const { checkGatewayStatus } = await import("../../gateway/client.js");
        const status = await checkGatewayStatus(config.gateway);
        console.log(status ? "Gateway is running" : "Gateway is not running");
      } catch (error) {
        console.log("Gateway is not running");
      }
    });

  return gateway;
}
