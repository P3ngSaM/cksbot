/**
 * Qwen-Omni-Realtime API Service - 通义千问实时双向语音对话
 *
 * WebSocket 端点: wss://dashscope.aliyuncs.com/api-ws/v1/realtime
 * 文档: https://help.aliyun.com/zh/model-studio/realtime
 *
 * 功能：
 * - 实时语音输入 (VAD 自动检测语音边界)
 * - 实时语音输出 (TTS)
 * - 双向低延迟对话
 */

import WebSocket from "ws";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/schema.js";

const logger = createLogger("qwen-realtime");

/**
 * Qwen Realtime 事件类型
 */
export type QwenRealtimeEvent =
  | { type: "connected" }
  | { type: "session_created"; sessionId: string }
  | { type: "audio_data"; data: string }  // base64 PCM audio (24kHz)
  | { type: "text"; text: string; isFinal: boolean }  // 助手回复文本
  | { type: "user_transcript"; text: string; isFinal: boolean }  // 用户语音转写
  | { type: "speech_started" }  // VAD 检测到用户开始说话
  | { type: "speech_stopped" }  // VAD 检测到用户停止说话
  | { type: "turn_complete" }
  | { type: "error"; message: string }
  | { type: "disconnected" };

export type QwenRealtimeEventCallback = (event: QwenRealtimeEvent) => void;

/**
 * Qwen Realtime Session 配置
 */
export interface QwenRealtimeConfig {
  apiKey: string;
  model?: string;  // qwen-omni-turbo-realtime, qwen3-omni-flash-realtime
  systemPrompt?: string;
  voice?: string;  // 音色名称
}

/**
 * Qwen Realtime Client
 * 基于 DashScope WebSocket API
 */
export class QwenRealtimeClient {
  private ws: WebSocket | null = null;
  private config: QwenRealtimeConfig;
  private eventCallback: QwenRealtimeEventCallback | null = null;
  private isSessionCreated = false;
  private sessionId: string | null = null;

  constructor(config: QwenRealtimeConfig) {
    this.config = {
      model: "qwen-omni-turbo-realtime",
      voice: "Cherry",  // 默认音色
      ...config,
    };
  }

  /**
   * 连接到 Qwen Realtime API
   */
  async connect(onEvent: QwenRealtimeEventCallback): Promise<void> {
    this.eventCallback = onEvent;

    return new Promise((resolve, reject) => {
      // DashScope Realtime WebSocket endpoint
      const model = this.config.model;
      const url = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${model}`;

      logger.info("Connecting to Qwen Realtime API", { model, url });

      try {
        this.ws = new WebSocket(url, {
          headers: {
            "Authorization": `bearer ${this.config.apiKey}`,
          },
        });
      } catch (err) {
        logger.error("Failed to create WebSocket", { error: err });
        reject(err);
        return;
      }

      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        logger.error("WebSocket connection timeout (10s)");
        this.emit({ type: "error", message: "Connection timeout" });
        if (this.ws) {
          this.ws.close();
        }
        reject(new Error("Connection timeout"));
      }, 10000);

      this.ws.on("open", () => {
        clearTimeout(connectTimeout);
        logger.info("WebSocket connected, sending session.update");
        this.emit({ type: "connected" });
        this.sendSessionUpdate();
        resolve();
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data);
      });

      this.ws.on("error", (error) => {
        clearTimeout(connectTimeout);
        logger.error("WebSocket error", { error: error.message });
        this.emit({ type: "error", message: error.message });
        reject(error);
      });

      this.ws.on("close", (code, reason) => {
        clearTimeout(connectTimeout);
        logger.info("WebSocket closed", { code, reason: reason.toString() });
        this.emit({ type: "disconnected" });
        this.isSessionCreated = false;
        this.sessionId = null;
      });

      this.ws.on("unexpected-response", (req, res) => {
        clearTimeout(connectTimeout);
        logger.error("Unexpected response from server", {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage
        });
        this.emit({ type: "error", message: `Unexpected response: ${res.statusCode} ${res.statusMessage}` });
        reject(new Error(`Unexpected response: ${res.statusCode}`));
      });
    });
  }

  /**
   * 发送 session.update 配置会话
   */
  private sendSessionUpdate() {
    const sessionUpdate = {
      type: "session.update",
      session: {
        // 输入配置
        input_audio_format: "pcm16",  // PCM 16-bit
        // 输出配置
        output_audio_format: "pcm16",
        // VAD 配置 (自动检测语音边界)
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        // 启用用户语音转写
        input_audio_transcription: {
          model: "qwen-asr-turbo",
        },
        // 指令/系统提示词
        instructions: this.config.systemPrompt || "你是一个友好的AI助手，请用简洁自然的中文回复用户。",
        // 音色
        voice: this.config.voice,
        // 模态
        modalities: ["text", "audio"],
      },
    };

    logger.info("Sending session.update", { voice: this.config.voice });
    this.send(sessionUpdate);
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(data: WebSocket.RawData) {
    try {
      const message = JSON.parse(data.toString());
      logger.debug("Received message", { type: message.type });

      switch (message.type) {
        case "session.created":
          logger.info("Session created", { sessionId: message.session?.id });
          this.isSessionCreated = true;
          this.sessionId = message.session?.id;
          this.emit({ type: "session_created", sessionId: message.session?.id || "" });
          break;

        case "session.updated":
          logger.info("Session updated");
          break;

        case "input_audio_buffer.speech_started":
          logger.debug("Speech started (VAD)");
          this.emit({ type: "speech_started" });
          break;

        case "input_audio_buffer.speech_stopped":
          logger.debug("Speech stopped (VAD)");
          this.emit({ type: "speech_stopped" });
          break;

        // 用户语音转写 (流式)
        case "conversation.item.input_audio_transcription.delta":
          if (message.delta) {
            logger.debug("User transcript delta", { delta: message.delta });
            this.emit({
              type: "user_transcript",
              text: message.delta,
              isFinal: false,
            });
          }
          break;

        // 用户语音转写 (完成)
        case "conversation.item.input_audio_transcription.completed":
          if (message.transcript) {
            logger.info("User transcript completed", { transcript: message.transcript });
            this.emit({
              type: "user_transcript",
              text: message.transcript,
              isFinal: true,
            });
          }
          break;

        case "response.audio.delta":
          // 音频数据块
          if (message.delta) {
            this.emit({
              type: "audio_data",
              data: message.delta,  // base64 PCM
            });
          }
          break;

        case "response.audio_transcript.delta":
          // 助手回复的文本转写
          if (message.delta) {
            this.emit({
              type: "text",
              text: message.delta,
              isFinal: false,
            });
          }
          break;

        case "response.audio_transcript.done":
          // 助手回复完成
          if (message.transcript) {
            this.emit({
              type: "text",
              text: message.transcript,
              isFinal: true,
            });
          }
          break;

        case "response.done":
          logger.debug("Response done");
          this.emit({ type: "turn_complete" });
          break;

        case "error":
          logger.error("Server error", { error: message.error });
          this.emit({
            type: "error",
            message: message.error?.message || JSON.stringify(message.error),
          });
          break;

        default:
          logger.debug("Unhandled message type", { type: message.type });
      }
    } catch (error) {
      logger.error("Failed to parse message", { error });
    }
  }

  /**
   * 发送音频数据 (PCM 16-bit, 16kHz/24kHz, mono)
   */
  sendAudio(audioBase64: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send audio: WebSocket not connected");
      return false;
    }

    if (!this.isSessionCreated) {
      logger.warn("Cannot send audio: Session not created");
      return false;
    }

    const message = {
      type: "input_audio_buffer.append",
      audio: audioBase64,
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * 提交音频缓冲区 (手动模式下使用)
   */
  commitAudio() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.send({ type: "input_audio_buffer.commit" });
    return true;
  }

  /**
   * 清空音频缓冲区
   */
  clearAudio() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.send({ type: "input_audio_buffer.clear" });
    return true;
  }

  /**
   * 发送文本消息 (可选，主要用于调试)
   */
  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send text: WebSocket not connected");
      return false;
    }

    // 创建一个包含文本的响应请求
    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: text,
        }],
      },
    };

    this.send(message);
    // 触发响应生成
    this.send({ type: "response.create" });
    return true;
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isSessionCreated = false;
    this.sessionId = null;
  }

  /**
   * 发送消息
   */
  private send(message: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 触发事件
   */
  private emit(event: QwenRealtimeEvent) {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  /**
   * 检查是否已连接并就绪
   */
  isReady(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isSessionCreated;
  }
}

/**
 * 从 Config 创建 Qwen Realtime Client
 */
export function createQwenRealtimeClient(config: Config, options?: {
  systemPrompt?: string;
  voice?: string;
}): QwenRealtimeClient | null {
  // 从配置中获取 Qwen API Key
  const apiKey = config.models?.qwen?.apiKey;

  if (!apiKey) {
    logger.error("Qwen API key not configured. Set models.qwen.apiKey in config.");
    return null;
  }

  return new QwenRealtimeClient({
    apiKey,
    model: config.models?.qwen?.realtimeModel || "qwen-omni-turbo-realtime",
    systemPrompt: options?.systemPrompt || config.agent?.systemPrompt,
    voice: options?.voice || config.models?.qwen?.voice || "Cherry",
  });
}
