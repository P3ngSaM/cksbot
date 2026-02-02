/**
 * Gateway WebSocket RPC server
 */

import { WebSocketServer, WebSocket } from "ws";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import type { Config } from "../config/schema.js";
import {
  type RPCRequest,
  type RPCResponse,
  type GatewayStatus,
  type ChannelStatus,
  GatewayMethods,
  createRPCResponse,
  createRPCError,
  RPCErrorCodes,
} from "./protocol/types.js";
import { runAgent } from "../agents/runner.js";
import { createDefaultTools } from "../agents/tools/common.js";
import { getSystemPrompt } from "../agents/system-prompt.js";
import { getAllSessionIds, clearSession, getChatHistory, getAllConversations, createConversation } from "../agents/context.js";
import {
  EventDispatcher,
  startWebSocketListener,
  type MessageReceivedEvent,
} from "../feishu/events.js";
import { createWebhookApp } from "../feishu/webhook.js";
import { getFeishuClient } from "../feishu/client.js";
import { replyTextMessage } from "../feishu/messages.js";
import { createLogger } from "../utils/logger.js";
import { startScheduler } from "../scheduler/index.js";
import {
  getAllUsers,
  getUserProfile,
  getAllScheduledTasks,
  deleteScheduledTask,
  updateScheduledTask,
  createScheduledTask,
  getIdentity,
  updateAssistantIdentity,
  updateGlobalUserIdentity,
} from "../agents/memory.js";
import { getAllSkills, toggleSkill } from "../agents/skills.js";
import { getSpeechService } from "../services/speech.js";
import { getVisionService } from "../services/vision.js";
import { VoiceAgentClient, createVoiceAgentClient, type VoiceAgentEvent } from "../services/voice-agent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const logger = createLogger("gateway");

const VERSION = "0.1.0";

interface GatewayState {
  startTime: Date;
  channels: Map<string, ChannelStatus>;
  config: Config;
}

// 存储每个客户端的 Voice Agent 会话
const voiceAgentClients = new Map<WebSocket, VoiceAgentClient>();

let state: GatewayState | null = null;
let wss: WebSocketServer | null = null;

/**
 * Start the gateway server
 */
export async function startGateway(options: {
  port: number;
  host: string;
  config: Config;
}): Promise<void> {
  const { port, host, config } = options;

  // Initialize state
  state = {
    startTime: new Date(),
    channels: new Map(),
    config,
  };

  // Create Hono app
  const app = new Hono();

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Serve static UI files from ui/dist
  // 计算项目根目录（从 dist/src/gateway/server.js 往上三级）
  const projectRoot = join(__dirname, "../../..");
  const uiDistPath = join(projectRoot, "ui/dist");

  if (existsSync(uiDistPath)) {
    // 定义 MIME 类型
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".json": "application/json",
    };

    // 处理静态文件请求
    app.get("/*", (c) => {
      let filePath = c.req.path;
      if (filePath === "/" || filePath === "") {
        filePath = "/index.html";
      }

      const fullPath = join(uiDistPath, filePath);

      // 安全检查：确保路径在 uiDistPath 内
      if (!fullPath.startsWith(uiDistPath)) {
        return c.text("Forbidden", 403);
      }

      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath);
        const ext = extname(fullPath);
        const contentType = mimeTypes[ext] || "application/octet-stream";
        return c.body(content, 200, { "Content-Type": contentType });
      }

      // SPA fallback: 返回 index.html
      const indexPath = join(uiDistPath, "index.html");
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath);
        return c.body(content, 200, { "Content-Type": "text/html" });
      }

      return c.text("Not Found", 404);
    });

    logger.info("Serving UI from " + uiDistPath);
  } else {
    logger.warn("UI dist not found at " + uiDistPath + ", run 'npm run ui:build' to build UI");
  }

  // Mount webhook handler if Feishu is configured in webhook mode
  if (config.channels.feishu?.mode === "webhook") {
    const dispatcher = new EventDispatcher();
    setupMessageHandler(dispatcher, config);
    const webhookApp = createWebhookApp(config.channels.feishu, dispatcher);
    app.route("/", webhookApp);
    logger.info("Webhook mode enabled");
  }

  // Start HTTP server
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });

  // Create WebSocket server
  wss = new WebSocketServer({ server: server as never });

  wss.on("connection", (ws) => {
    logger.info("Client connected");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as RPCRequest;

        // Check if this is a streaming request
        if (message.method === GatewayMethods.AGENT_RUN || message.method === "agent.run") {
          const params = message.params as {
            sessionId?: string;
            message?: string;
            userId?: string;
            chatId?: string;
            stream?: boolean;
          };

          if (params?.stream) {
            // Handle streaming request
            await handleStreamingAgentRun(ws, message.id, params, config);
            return;
          }
        }

        // Check for realtime voice messages (non-RPC format)
        const msgAny = message as unknown as { type?: string; [key: string]: unknown };
        if (msgAny.type && msgAny.type.startsWith("realtime.")) {
          handleRealtimeVoice(ws, msgAny as { type: string; [key: string]: unknown }, config);
          return;
        }

        // Non-streaming request
        const response = await handleRPCRequest(message, config);
        ws.send(JSON.stringify(response));
      } catch (error) {
        const errorResponse = createRPCResponse(
          "",
          undefined,
          createRPCError(
            RPCErrorCodes.PARSE_ERROR,
            error instanceof Error ? error.message : "Parse error"
          )
        );
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on("close", () => {
      logger.info("Client disconnected");
      // 清理 Voice Agent 客户端
      const voiceClient = voiceAgentClients.get(ws);
      if (voiceClient) {
        voiceClient.disconnect();
        voiceAgentClients.delete(ws);
      }
    });
  });

  // Start Feishu channel if configured in websocket mode
  if (config.channels.feishu?.mode === "websocket") {
    await startFeishuChannel(config);
  }

  // Start scheduler for timed tasks
  startScheduler(config, 60000); // 每分钟检查一次
  logger.info("Scheduler started");

  logger.info(`Gateway server started on ${host}:${port}`);

  // Keep the process running
  await new Promise(() => {});
}

// 消息去重：记录已处理的消息ID
const processedMessages = new Set<string>();
const MESSAGE_CACHE_TTL = 60000; // 60秒后清除

function markMessageProcessed(messageId: string): boolean {
  if (processedMessages.has(messageId)) {
    return false; // 已处理过
  }
  processedMessages.add(messageId);
  // 60秒后自动清除
  setTimeout(() => processedMessages.delete(messageId), MESSAGE_CACHE_TTL);
  return true; // 首次处理
}

/**
 * Setup message handler for Feishu events
 */
function setupMessageHandler(dispatcher: EventDispatcher, config: Config): void {
  dispatcher.onMessage(async (event: MessageReceivedEvent) => {
    // 消息去重检查
    if (!markMessageProcessed(event.messageId)) {
      logger.debug("Skipping duplicate message", { messageId: event.messageId });
      return;
    }

    logger.info("Received message", {
      messageId: event.messageId,
      chatId: event.chatId,
      content: event.content.substring(0, 100),
    });

    // Skip messages from bots
    if (event.senderType === "bot") {
      return;
    }

    // Check if mention is required in group chats
    const feishuConfig = config.channels.feishu;
    if (feishuConfig?.requireMention && event.chatType === "group") {
      // Check if bot is mentioned
      if (!event.mentions || event.mentions.length === 0) {
        logger.debug("Skipping message without mention in group");
        return;
      }
    }

    // Remove mention from content
    let content = event.content;
    if (event.mentions) {
      for (const mention of event.mentions) {
        content = content.replace(mention.key, "").trim();
      }
    }

    // Run agent
    try {
      const tools = await createDefaultTools(config);
      const systemPrompt = getSystemPrompt(config);

      const response = await runAgent({
        sessionId: event.chatId,
        tools,
        systemPrompt,
        userMessage: content,
        config,
        userId: event.senderId,
        chatId: event.chatId,
      });

      // Reply to the message
      if (feishuConfig) {
        const client = getFeishuClient(feishuConfig);
        await replyTextMessage(client, event.messageId, response.content);
      }
    } catch (error) {
      logger.error("Failed to process message", error);

      // Send error reply
      if (feishuConfig) {
        const client = getFeishuClient(feishuConfig);
        await replyTextMessage(
          client,
          event.messageId,
          "抱歉，处理您的请求时出现错误，请稍后重试。"
        );
      }
    }
  });
}

/**
 * Start Feishu channel with WebSocket mode
 */
async function startFeishuChannel(config: Config): Promise<void> {
  const feishuConfig = config.channels.feishu;
  if (!feishuConfig) {
    logger.warn("Feishu channel not configured");
    return;
  }

  logger.info("Starting Feishu channel...", { appId: feishuConfig.appId, mode: feishuConfig.mode });

  try {
    logger.debug("Setting up Feishu message dispatcher...");
    const dispatcher = new EventDispatcher();
    setupMessageHandler(dispatcher, config);

    logger.debug("Starting Feishu WebSocket listener...");
    startWebSocketListener(feishuConfig, dispatcher);

    state?.channels.set("feishu", {
      id: "feishu",
      type: "feishu",
      status: "running",
      connectedAt: new Date().toISOString(),
    });

    logger.info("Feishu channel started successfully");
  } catch (error: unknown) {
    let errorMsg: string;
    let errorDetail: Record<string, unknown>;

    if (error instanceof Error) {
      errorMsg = error.message;
      errorDetail = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      errorMsg = String(error);
      errorDetail = { raw: errorMsg };
    }

    logger.error("Failed to start Feishu channel", errorDetail);

    state?.channels.set("feishu", {
      id: "feishu",
      type: "feishu",
      status: "error",
      error: errorMsg,
    });
  }
}

/**
 * Handle RPC request
 */
async function handleRPCRequest(
  request: RPCRequest,
  config: Config
): Promise<RPCResponse> {
  logger.debug("RPC request", { method: request.method });

  switch (request.method) {
    case GatewayMethods.PING:
      return createRPCResponse(request.id, { pong: true });

    case GatewayMethods.STATUS:
      return createRPCResponse(request.id, getStatus());

    case GatewayMethods.CHANNEL_LIST:
      return createRPCResponse(request.id, {
        channels: [...(state?.channels.values() ?? [])],
      });

    case GatewayMethods.SESSION_LIST:
      return createRPCResponse(request.id, {
        sessions: getAllSessionIds(),
      });

    case GatewayMethods.SESSION_CLEAR:
      const sessionId = (request.params as { sessionId: string })?.sessionId;
      if (sessionId) {
        clearSession(sessionId);
      }
      return createRPCResponse(request.id, { success: true });

    // Chat history API
    case "chat.history": {
      const chatSessionId = (request.params as { sessionId: string })?.sessionId ?? "web-chat";
      const history = getChatHistory(chatSessionId);
      return createRPCResponse(request.id, { messages: history });
    }

    // 获取所有对话列表
    case "chat.list": {
      const conversations = getAllConversations();
      return createRPCResponse(request.id, { conversations });
    }

    // 创建新对话
    case "chat.new": {
      const newSessionId = createConversation();
      return createRPCResponse(request.id, { sessionId: newSessionId });
    }

    // 删除对话
    case "chat.delete": {
      const deleteSessionId = (request.params as { sessionId: string })?.sessionId;
      if (deleteSessionId) {
        clearSession(deleteSessionId);
      }
      return createRPCResponse(request.id, { success: true });
    }

    case GatewayMethods.AGENT_RUN:
      const params = request.params as {
        sessionId: string;
        message: string;
        userId?: string;
        chatId?: string;
        stream?: boolean;
      };

      if (!params?.message) {
        return createRPCResponse(
          request.id,
          undefined,
          createRPCError(RPCErrorCodes.INVALID_PARAMS, "message is required")
        );
      }

      // Note: For streaming, we need the WebSocket reference - this is handled separately
      // This non-streaming path remains for backward compatibility
      try {
        const tools = await createDefaultTools(config);
        const systemPrompt = getSystemPrompt(config);

        const response = await runAgent({
          sessionId: params.sessionId ?? `rpc-${Date.now()}`,
          tools,
          systemPrompt,
          userMessage: params.message,
          config,
          userId: params.userId,
          chatId: params.chatId,
        });

        return createRPCResponse(request.id, response);
      } catch (error) {
        return createRPCResponse(
          request.id,
          undefined,
          createRPCError(
            RPCErrorCodes.INTERNAL_ERROR,
            error instanceof Error ? error.message : "Agent execution failed"
          )
        );
      }

    // Memory APIs
    case GatewayMethods.MEMORY_USERS:
    case "memory.users":
      return createRPCResponse(request.id, { users: getAllUsers() });

    case GatewayMethods.MEMORY_USER_GET:
    case "memory.user.get": {
      const userId = (request.params as { userId: string })?.userId;
      if (!userId) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "userId required"));
      }
      return createRPCResponse(request.id, { user: getUserProfile(userId) });
    }

    // Schedules APIs
    case GatewayMethods.SCHEDULES_LIST:
    case "schedules.list":
      return createRPCResponse(request.id, { tasks: getAllScheduledTasks() });

    case GatewayMethods.SCHEDULES_DELETE:
    case "schedules.delete": {
      const taskId = (request.params as { taskId: string })?.taskId;
      if (!taskId) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "taskId required"));
      }
      const deleted = deleteScheduledTask(taskId);
      return createRPCResponse(request.id, { success: deleted });
    }

    case GatewayMethods.SCHEDULES_TOGGLE:
    case "schedules.toggle": {
      const { taskId: toggleTaskId, enabled } = (request.params as { taskId: string; enabled: boolean }) ?? {};
      if (!toggleTaskId) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "taskId required"));
      }
      const updated = updateScheduledTask(toggleTaskId, { enabled });
      return createRPCResponse(request.id, { success: updated });
    }

    // Skills APIs
    case GatewayMethods.SKILLS_LIST:
    case "skills.list":
      return createRPCResponse(request.id, { skills: getAllSkills() });

    case GatewayMethods.SKILLS_TOGGLE:
    case "skills.toggle": {
      const { skillId, enabled: skillEnabled } = (request.params as { skillId: string; enabled: boolean }) ?? {};
      if (!skillId) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "skillId required"));
      }
      const toggled = toggleSkill(skillId, skillEnabled);
      return createRPCResponse(request.id, { success: toggled });
    }

    // Identity APIs
    case "agent.identity.get":
      return createRPCResponse(request.id, getIdentity());

    case "agent.identity.set": {
      const identityParams = request.params as {
        assistant?: { name?: string; avatar?: string; personality?: string };
        user?: { name?: string; avatar?: string };
      };
      if (identityParams?.assistant) {
        updateAssistantIdentity(identityParams.assistant);
      }
      if (identityParams?.user) {
        updateGlobalUserIdentity(identityParams.user);
      }
      return createRPCResponse(request.id, { success: true, identity: getIdentity() });
    }

    // Config management
    case "config.update": {
      const configParams = request.params as {
        model?: {
          provider?: string;
          modelName?: string;
          apiKey?: string;
          baseUrl?: string;
        };
        channels?: {
          feishu?: {
            appId?: string;
            appSecret?: string;
            mode?: 'websocket' | 'webhook';
          };
        };
      };

      try {
        // Merge with existing config
        const updatedConfig = { ...config };

        // Update model config based on provider
        if (configParams.model) {
          const { provider, apiKey, baseUrl } = configParams.model;

          updatedConfig.models = updatedConfig.models || {};

          // MiniMax uses Anthropic-compatible API
          if (provider === 'minimax' && apiKey) {
            updatedConfig.models.anthropic = {
              apiKey,
              baseUrl: baseUrl || 'https://api.minimaxi.com/anthropic',
              authType: 'bearer'
            };
          } else if (provider === 'anthropic' && apiKey) {
            updatedConfig.models.anthropic = { apiKey, baseUrl };
          } else if (provider === 'openai' && apiKey) {
            updatedConfig.models.openai = { apiKey, baseUrl, model: configParams.model.modelName };
          }
        }

        if (configParams.channels?.feishu) {
          const feishuParams = configParams.channels.feishu;
          if (feishuParams.appId && feishuParams.appSecret && feishuParams.mode) {
            updatedConfig.channels = updatedConfig.channels || {};
            updatedConfig.channels.feishu = {
              appId: feishuParams.appId,
              appSecret: feishuParams.appSecret,
              mode: feishuParams.mode,
              dmPolicy: 'pairing',
              requireMention: true,
            };
          }
        }

        // Save to disk
        const { saveConfig } = await import('../config/io.js');
        saveConfig(updatedConfig);

        // Update in-memory config
        Object.assign(config, updatedConfig);

        logger.info("Config updated successfully");
        return createRPCResponse(request.id, { success: true });
      } catch (error) {
        logger.error("Failed to update config", error);
        return createRPCResponse(
          request.id,
          undefined,
          createRPCError(RPCErrorCodes.INTERNAL_ERROR, "Failed to save config")
        );
      }
    }

    // Speech APIs (TTS/STT)
    case "speech.tts": {
      const ttsParams = request.params as {
        text: string;
        voice?: string;
        speed?: number;
      };
      if (!ttsParams?.text) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "text required"));
      }
      const speechService = getSpeechService(config);
      const ttsResult = await speechService.textToSpeech(ttsParams.text, {
        voice: ttsParams.voice,
        speed: ttsParams.speed,
      });
      if (ttsResult.success && ttsResult.audioData) {
        return createRPCResponse(request.id, {
          success: true,
          audioPath: ttsResult.audioPath,
          audioBase64: ttsResult.audioData.toString("base64"),
        });
      }
      return createRPCResponse(request.id, { success: false, error: ttsResult.error });
    }

    case "speech.stt": {
      const sttParams = request.params as {
        audioBase64?: string;
        audioPath?: string;
        language?: string;
      };
      let audioPath = sttParams?.audioPath;

      // If base64 audio is provided, write to temp file
      if (sttParams?.audioBase64 && !audioPath) {
        audioPath = join(tmpdir(), `stt_${Date.now()}.mp3`);
        writeFileSync(audioPath, Buffer.from(sttParams.audioBase64, "base64"));
      }

      if (!audioPath) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "audioPath or audioBase64 required"));
      }

      const speechService = getSpeechService(config);
      const sttResult = await speechService.speechToText(audioPath, {
        language: sttParams?.language,
      });
      return createRPCResponse(request.id, sttResult);
    }

    case "speech.voices": {
      const speechService = getSpeechService(config);
      const voices = await speechService.getAvailableVoices();
      return createRPCResponse(request.id, { voices });
    }

    // Vision APIs
    case "vision.analyze": {
      const visionParams = request.params as {
        imagePath?: string;
        imageBase64?: string;
        prompt?: string;
        extractText?: boolean;
      };
      let imagePath = visionParams?.imagePath;

      // If base64 image is provided, write to temp file
      if (visionParams?.imageBase64 && !imagePath) {
        imagePath = join(tmpdir(), `vision_${Date.now()}.png`);
        writeFileSync(imagePath, Buffer.from(visionParams.imageBase64, "base64"));
      }

      if (!imagePath) {
        return createRPCResponse(request.id, undefined, createRPCError(RPCErrorCodes.INVALID_PARAMS, "imagePath or imageBase64 required"));
      }

      const visionService = getVisionService(config);
      const visionResult = await visionService.analyzeImage(imagePath, {
        prompt: visionParams?.prompt,
        extractText: visionParams?.extractText,
      });
      return createRPCResponse(request.id, visionResult);
    }

    case "vision.screenshot": {
      const screenshotParams = request.params as {
        prompt?: string;
        display?: number;
      };
      const visionService = getVisionService(config);
      const result = await visionService.screenshotAndAnalyze({
        prompt: screenshotParams?.prompt,
        display: screenshotParams?.display,
      });
      return createRPCResponse(request.id, result);
    }

    default:
      return createRPCResponse(
        request.id,
        undefined,
        createRPCError(RPCErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${request.method}`)
      );
  }
}

/**
 * Handle realtime voice WebSocket messages
 * 使用 Voice Agent (ASR + Agent + TTS 分离架构)
 */
function handleRealtimeVoice(
  ws: WebSocket,
  message: { type: string; [key: string]: unknown },
  config: Config
) {
  switch (message.type) {
    case "realtime.connect": {
      // 创建 Voice Agent 客户端
      const systemPrompt = message["systemPrompt"] as string | undefined;
      const voice = message["voice"] as string | undefined;
      const sessionId = `voice-${Date.now()}`;

      const client = createVoiceAgentClient(config, sessionId, {
        systemPrompt,
        voice,
      });

      if (!client) {
        ws.send(JSON.stringify({
          type: "realtime.error",
          error: "Failed to create Voice Agent client. Check models.qwen.apiKey in config.",
        }));
        return;
      }

      // 保存客户端
      voiceAgentClients.set(ws, client);

      // 连接并转发事件
      client.connect((event: VoiceAgentEvent) => {
        if (ws.readyState === WebSocket.OPEN) {
          // 映射 Voice Agent 事件到前端事件格式
          let mappedEvent: Record<string, unknown>;
          switch (event.type) {
            case "ready":
              mappedEvent = { type: "realtime.setup_complete" };
              break;
            case "listening":
              mappedEvent = { type: "realtime.listening" };
              break;
            case "user_speaking":
              mappedEvent = { type: "realtime.speech_started" };
              break;
            case "user_transcript":
              mappedEvent = { type: "realtime.user_transcript", text: event.text, isFinal: event.isFinal };
              break;
            case "thinking":
              mappedEvent = { type: "realtime.thinking" };
              break;
            case "agent_text":
              mappedEvent = { type: "realtime.text", text: event.text, isFinal: event.isFinal };
              break;
            case "audio_data":
              mappedEvent = { type: "realtime.audio_data", data: event.data };
              break;
            case "speaking":
              mappedEvent = { type: "realtime.speaking" };
              break;
            case "turn_complete":
              mappedEvent = { type: "realtime.turn_complete" };
              break;
            case "error":
              mappedEvent = { type: "realtime.error", message: event.message };
              break;
            case "disconnected":
              mappedEvent = { type: "realtime.disconnected" };
              break;
            default:
              mappedEvent = { ...event, type: `realtime.${event.type}` };
          }
          ws.send(JSON.stringify(mappedEvent));
        }
      }).catch((error) => {
        ws.send(JSON.stringify({
          type: "realtime.error",
          error: error.message,
        }));
      });
      break;
    }

    case "realtime.audio": {
      // 发送音频数据 (PCM 16-bit, 16kHz, mono, base64)
      const client = voiceAgentClients.get(ws);
      if (client) {
        const audioBase64 = message["audio"] as string;
        if (audioBase64) {
          client.sendAudio(audioBase64);
        }
      }
      break;
    }

    case "realtime.disconnect": {
      // 断开连接
      const client = voiceAgentClients.get(ws);
      if (client) {
        client.disconnect();
        voiceAgentClients.delete(ws);
      }
      break;
    }
  }
}

/**
 * Get gateway status
 */
function getStatus(): GatewayStatus {
  const uptime = state ? Date.now() - state.startTime.getTime() : 0;

  return {
    version: VERSION,
    uptime,
    channels: [...(state?.channels.values() ?? [])],
    activeSessions: getAllSessionIds().length,
  };
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(message: unknown): void {
  if (!wss) return;

  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Handle streaming agent run request
 */
async function handleStreamingAgentRun(
  ws: WebSocket,
  requestId: string,
  params: {
    sessionId?: string;
    message?: string;
    userId?: string;
    chatId?: string;
  },
  config: Config
): Promise<void> {
  if (!params.message) {
    ws.send(JSON.stringify(createRPCResponse(
      requestId,
      undefined,
      createRPCError(RPCErrorCodes.INVALID_PARAMS, "message is required")
    )));
    return;
  }

  try {
    const tools = await createDefaultTools(config);
    const systemPrompt = getSystemPrompt(config);

    const response = await runAgent({
      sessionId: params.sessionId ?? `rpc-${Date.now()}`,
      tools,
      systemPrompt,
      userMessage: params.message,
      config,
      userId: params.userId,
      chatId: params.chatId,
      stream: true,
      onStream: (event) => {
        // Send streaming events to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            method: "agent.stream",
            params: event,
          }));
        }
      },
    });

    // Send final response
    ws.send(JSON.stringify(createRPCResponse(requestId, response)));
  } catch (error) {
    ws.send(JSON.stringify(createRPCResponse(
      requestId,
      undefined,
      createRPCError(
        RPCErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : "Agent execution failed"
      )
    )));
  }
}
