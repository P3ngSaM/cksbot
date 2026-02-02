/**
 * Feishu channel plugin for FeishuPilot
 */

import type { Plugin } from "../../src/plugins/types.js";
import { feishuChannelPlugin } from "./src/channel.js";

/**
 * Feishu plugin
 */
export const feishuPlugin: Plugin = {
  meta: {
    id: "feishu",
    name: "Feishu Channel",
    version: "0.1.0",
    description: "飞书通道插件 - 支持通过飞书机器人接收和发送消息",
    author: "FeishuPilot",
  },
  channel: feishuChannelPlugin,
};

export default feishuPlugin;

// Re-export utilities
export * from "./src/channel.js";
export * from "./src/monitor.js";
export * from "./src/outbound.js";
