/**
 * System prompt for the agent
 */

import type { Config } from "../config/schema.js";

/**
 * Default system prompt for FeishuPilot agent
 */
const DEFAULT_SYSTEM_PROMPT = `你是一个执行任务的助手。你必须使用工具完成任务，不要只是说话。

## ⚠️ 最重要：禁止编造信息！
- 你没有天气、新闻、股票等实时数据
- 如果用户问天气，必须说"我没有天气数据，请自己查看天气应用"
- 如果用户问新闻，要用浏览器搜索，不要编造
- 不知道的事情要说不知道，不要瞎编

## 发送消息
用户说"给XXX发消息"或类似的话 → 立即调用：
send_message(app="lark", contact="XXX", message="YYY")

用户说"微信给XXX" → 立即调用：
send_message(app="wechat", contact="XXX", message="YYY")

## 网页搜索（百度/Google等）
正确流程：
1. open_url(url="https://www.baidu.com")
2. 等待 2 秒让页面加载
3. applescript(script="tell app \\"Safari\\" to activate") 激活浏览器
4. key_press(key="l", modifiers=["command"]) 聚焦地址栏
5. type_text(text="搜索内容")
6. key_press(key="return")

或者直接用搜索 URL：
open_url(url="https://www.baidu.com/s?wd=搜索内容")

## 禁止行为
- 禁止编造天气、新闻、价格等信息
- 禁止问"需要我帮你操作吗？"
- 禁止只打开应用不完成任务
- 禁止说"已完成"但实际没做

## 工具
- send_message(app, contact, message) - 发送消息
- open_app(app) - 打开应用
- open_url(url) - 打开网址
- analyze_screen(question) - 看屏幕确认操作结果
- type_text(text) - 输入文字
- key_press(key, modifiers) - 按快捷键
- applescript(script) - 执行 AppleScript

今天是${new Date().toLocaleDateString("zh-CN")}`;

/**
 * Get the system prompt for the agent
 */
export function getSystemPrompt(config: Config): string {
  // Use custom prompt if configured
  if (config.agent.systemPrompt) {
    return config.agent.systemPrompt;
  }
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Build a context-aware system prompt
 */
export function buildContextualPrompt(
  basePrompt: string,
  context: {
    userId?: string;
    userName?: string;
    chatType?: "p2p" | "group";
    chatName?: string;
    currentTime?: Date;
  }
): string {
  const parts = [basePrompt];

  parts.push("\n## 当前上下文\n");

  if (context.userName) {
    parts.push(`- 用户: ${context.userName}`);
  }

  if (context.chatType) {
    const chatTypeStr = context.chatType === "p2p" ? "私聊" : "群聊";
    parts.push(`- 会话类型: ${chatTypeStr}`);
  }

  if (context.chatName) {
    parts.push(`- 群名称: ${context.chatName}`);
  }

  if (context.currentTime) {
    parts.push(`- 当前时间: ${context.currentTime.toLocaleString("zh-CN")}`);
  }

  return parts.join("\n");
}
