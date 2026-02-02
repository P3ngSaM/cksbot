/**
 * CLI entry point
 */

import { Command } from "commander";
import { createConfigCommand } from "./commands/config.js";
import { createGatewayCommand } from "./commands/gateway.js";
import { createAgentCommand } from "./commands/agent.js";

export function createCLI(): Command {
  const program = new Command();

  program
    .name("cksbot")
    .description("CKS Bot - AI 语音助手")
    .version("0.1.0");

  program.addCommand(createConfigCommand());
  program.addCommand(createGatewayCommand());
  program.addCommand(createAgentCommand());

  return program;
}

export async function runCLI(args: string[] = process.argv): Promise<void> {
  const program = createCLI();
  await program.parseAsync(args);
}
