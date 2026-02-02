/**
 * Agent CLI command
 */

import { Command } from "commander";
import { loadConfig } from "../../config/index.js";
import { logger, setLogLevel } from "../../utils/logger.js";

export function createAgentCommand(): Command {
  const agent = new Command("agent").description("Run agent commands");

  agent
    .command("run")
    .description("Run the agent with a message")
    .option("-m, --message <message>", "Message to send to the agent")
    .option("-s, --session <session>", "Session ID for conversation context")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (options: { message?: string; session?: string; verbose?: boolean }) => {
      if (options.verbose) {
        setLogLevel("debug");
      }

      if (!options.message) {
        console.error("Error: --message is required");
        process.exit(1);
      }

      try {
        const config = loadConfig();

        logger.debug("Running agent with message", { message: options.message });

        const { runAgent } = await import("../../agents/runner.js");
        const { createDefaultTools } = await import("../../agents/tools/common.js");
        const { getSystemPrompt } = await import("../../agents/system-prompt.js");

        const tools = await createDefaultTools(config);
        const systemPrompt = getSystemPrompt(config);

        const response = await runAgent({
          sessionId: options.session ?? `cli-${Date.now()}`,
          tools,
          systemPrompt,
          userMessage: options.message,
          config,
        });

        console.log("\nAgent Response:");
        console.log(response.content);

        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log("\nTool Calls:");
          for (const call of response.toolCalls) {
            console.log(`  - ${call.name}: ${JSON.stringify(call.result)}`);
          }
        }
      } catch (error) {
        logger.error("Failed to run agent", error);
        process.exit(1);
      }
    });

  return agent;
}
