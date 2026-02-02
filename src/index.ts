#!/usr/bin/env node
/**
 * FeishuPilot - 飞书自主Agent
 *
 * 通过飞书机器人接收指令，本地执行任务
 */

import { runCLI } from "./cli/index.js";

runCLI().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
