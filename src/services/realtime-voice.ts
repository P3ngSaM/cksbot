/**
 * Realtime Voice Service - 实时语音对话
 * 支持 MiniMax WebSocket TTS API (wss://api.minimaxi.com/ws/v1/t2a_v2)
 *
 * 功能：
 * - 流式语音合成 (TTS)
 * - 低延迟音频输出
 */

import WebSocket from "ws";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/schema.js";

const logger = createLogger("realtime-voice");

/**
 * Realtime Voice 事件类型
 */
export type RealtimeEvent =
  | { type: "connected" }
  | { type: "task_started" }
  | { type: "response_audio"; audioHex: string }
  | { type: "response_done" }
  | { type: "error"; message: string }
  | { type: "disconnected" };

export type RealtimeEventCallback = (event: RealtimeEvent) => void;

/**
 * Realtime Voice Session 配置
 */
export interface RealtimeSessionConfig {
  apiKey: string;
  baseUrl?: string;
  voice?: string;
  model?: string;
  sampleRate?: number;
  format?: string;
}

/**
 * MiniMax WebSocket TTS Client
 * 基于文档: https://platform.minimaxi.com/docs/guides/speech-t2a-websocket
 */
export class RealtimeVoiceClient {
  private ws: WebSocket | null = null;
  private config: RealtimeSessionConfig;
  private eventCallback: RealtimeEventCallback | null = null;
  private isTaskStarted = false;

  constructor(config: RealtimeSessionConfig) {
    this.config = {
      baseUrl: "wss://api.minimaxi.com/ws/v1/t2a_v2",
      voice: "female-shaonv",  // 少女音色
      model: "speech-02-hd",
      sampleRate: 32000,
      format: "mp3",
      ...config,
    };
  }

  /**
   * 连接到 MiniMax WebSocket TTS API
   */
  async connect(onEvent: RealtimeEventCallback): Promise<void> {
    this.eventCallback = onEvent;

    return new Promise((resolve, reject) => {
      const url = this.config.baseUrl!;

      logger.info("Connecting to MiniMax WebSocket TTS", { url });

      this.ws = new WebSocket(url, {
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
      });

      this.ws.on("open", () => {
        logger.info("WebSocket connected, waiting for server confirmation");
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data, resolve, reject);
      });

      this.ws.on("error", (error) => {
        logger.error("WebSocket error", { error: error.message });
        this.emit({ type: "error", message: error.message });
        reject(error);
      });

      this.ws.on("close", (code, reason) => {
        logger.info("WebSocket closed", { code, reason: reason.toString() });
        this.emit({ type: "disconnected" });
        this.isTaskStarted = false;
      });
    });
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(
    data: WebSocket.RawData,
    resolveConnect?: (value: void) => void,
    rejectConnect?: (error: Error) => void
  ) {
    try {
      const message = JSON.parse(data.toString());
      logger.debug("Received message", { event: message.event });

      switch (message.event) {
        case "connected_success":
          logger.info("Connection confirmed by server");
          this.emit({ type: "connected" });
          if (resolveConnect) resolveConnect();
          break;

        case "task_started":
          logger.info("Task started");
          this.isTaskStarted = true;
          this.emit({ type: "task_started" });
          break;

        case "task_failed":
          const errorMsg = message.message || "Task failed";
          logger.error("Task failed", { message: errorMsg });
          this.emit({ type: "error", message: errorMsg });
          if (rejectConnect) rejectConnect(new Error(errorMsg));
          break;

        default:
          // 音频数据响应
          if (message.data?.audio) {
            this.emit({
              type: "response_audio",
              audioHex: message.data.audio,
            });
          }

          // 检查是否是最后一个数据块
          if (message.is_final) {
            logger.info("Audio synthesis completed");
            this.emit({ type: "response_done" });
          }
      }
    } catch (error) {
      logger.error("Failed to parse message", { error, data: data.toString().substring(0, 200) });
    }
  }

  /**
   * 开始 TTS 任务
   */
  startTask() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot start task: WebSocket not connected");
      return false;
    }

    const taskStartMsg = {
      event: "task_start",
      model: this.config.model,
      voice_setting: {
        voice_id: this.config.voice,
        speed: 1,
        vol: 1,
        pitch: 0,
        english_normalization: false,
      },
      audio_setting: {
        sample_rate: this.config.sampleRate,
        bitrate: 128000,
        format: this.config.format,
        channel: 1,
      },
      continuous_sound: false,
    };

    logger.info("Starting TTS task", { voice: this.config.voice, model: this.config.model });
    this.ws.send(JSON.stringify(taskStartMsg));
    return true;
  }

  /**
   * 发送文本进行语音合成
   */
  synthesize(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot synthesize: WebSocket not connected");
      return false;
    }

    if (!this.isTaskStarted) {
      logger.warn("Cannot synthesize: Task not started");
      return false;
    }

    const continueMsg = {
      event: "task_continue",
      text: text,
    };

    logger.info("Synthesizing text", { textLength: text.length });
    this.ws.send(JSON.stringify(continueMsg));
    return true;
  }

  /**
   * 结束任务
   */
  finishTask() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: "task_finish" }));
      this.isTaskStarted = false;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.finishTask();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isTaskStarted = false;
  }

  /**
   * 触发事件
   */
  private emit(event: RealtimeEvent) {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 检查任务是否已启动
   */
  isReady(): boolean {
    return this.isConnected() && this.isTaskStarted;
  }
}

/**
 * 从 Config 创建 Realtime Voice Client
 */
export function createRealtimeVoiceClient(config: Config, options?: {
  voice?: string;
}): RealtimeVoiceClient | null {
  // 优先使用 speech.realtime 配置的 apiKey，然后是 tts 的 apiKey，最后是 anthropic 的
  const realtimeConfig = config.models?.speech?.realtime;
  const ttsConfig = config.models?.speech?.tts;
  const apiKey = realtimeConfig?.apiKey || ttsConfig?.apiKey || config.models?.anthropic?.apiKey;

  if (!apiKey) {
    logger.error("API key not configured for realtime voice. Set models.speech.realtime.apiKey in config.");
    return null;
  }

  return new RealtimeVoiceClient({
    apiKey,
    baseUrl: realtimeConfig?.baseUrl || "wss://api.minimaxi.com/ws/v1/t2a_v2",
    voice: options?.voice || realtimeConfig?.voice || ttsConfig?.voice || "female-shaonv",
    model: realtimeConfig?.model || ttsConfig?.model || "speech-02-hd",
  });
}
