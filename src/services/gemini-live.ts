/**
 * Gemini Live API Service - 实时双向语音对话
 * 支持 Google Gemini Live API (WebSocket)
 *
 * WebSocket 端点: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
 *
 * 功能：
 * - 实时语音输入 (STT)
 * - 实时语音输出 (TTS)
 * - 双向低延迟对话
 */

import WebSocket from "ws";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/schema.js";

const logger = createLogger("gemini-live");

/**
 * Gemini Live 事件类型
 */
export type GeminiLiveEvent =
  | { type: "connected" }
  | { type: "setup_complete" }
  | { type: "audio_data"; data: string }  // base64 audio
  | { type: "text"; text: string; isFinal: boolean }
  | { type: "turn_complete" }
  | { type: "interrupted" }
  | { type: "error"; message: string }
  | { type: "disconnected" };

export type GeminiLiveEventCallback = (event: GeminiLiveEvent) => void;

/**
 * Gemini Live Session 配置
 */
export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  voiceName?: string;  // Puck, Charon, Kore, Fenrir, Aoede
}

/**
 * Gemini Live Client
 * 基于文档: https://ai.google.dev/gemini-api/docs/live
 */
export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig;
  private eventCallback: GeminiLiveEventCallback | null = null;
  private isSetupComplete = false;

  constructor(config: GeminiLiveConfig) {
    this.config = {
      model: "gemini-2.0-flash-live-001",
      voiceName: "Puck",
      ...config,
    };
  }

  /**
   * 连接到 Gemini Live API
   */
  async connect(onEvent: GeminiLiveEventCallback): Promise<void> {
    this.eventCallback = onEvent;

    return new Promise((resolve, reject) => {
      // Gemini Live API WebSocket endpoint
      const baseUrl = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
      const url = `${baseUrl}?key=${this.config.apiKey}`;

      logger.info("Connecting to Gemini Live API", { model: this.config.model, url: url.replace(this.config.apiKey, "***") });

      try {
        this.ws = new WebSocket(url);
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
        logger.info("WebSocket connected, sending setup message");
        this.emit({ type: "connected" });
        this.sendSetup();
        resolve();
      });

      this.ws.on("message", (data) => {
        logger.debug("Received raw message", { size: data.toString().length });
        this.handleMessage(data);
      });

      this.ws.on("error", (error) => {
        clearTimeout(connectTimeout);
        logger.error("WebSocket error", { error: error.message, stack: (error as Error).stack });
        this.emit({ type: "error", message: error.message });
        reject(error);
      });

      this.ws.on("close", (code, reason) => {
        clearTimeout(connectTimeout);
        logger.info("WebSocket closed", { code, reason: reason.toString() });
        this.emit({ type: "disconnected" });
        this.isSetupComplete = false;
      });

      this.ws.on("unexpected-response", (req, res) => {
        clearTimeout(connectTimeout);
        logger.error("Unexpected response from server", { statusCode: res.statusCode, statusMessage: res.statusMessage });
        this.emit({ type: "error", message: `Unexpected response: ${res.statusCode} ${res.statusMessage}` });
        reject(new Error(`Unexpected response: ${res.statusCode}`));
      });
    });
  }

  /**
   * 发送初始化配置
   */
  private sendSetup() {
    const setupMessage = {
      setup: {
        model: `models/${this.config.model}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName,
              },
            },
          },
        },
        systemInstruction: this.config.systemInstruction ? {
          parts: [{ text: this.config.systemInstruction }],
        } : undefined,
      },
    };

    logger.info("Sending setup", { model: this.config.model, voice: this.config.voiceName });
    this.send(setupMessage);
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(data: WebSocket.RawData) {
    try {
      const message = JSON.parse(data.toString());
      logger.debug("Received message", { keys: Object.keys(message) });

      // Setup complete
      if (message.setupComplete) {
        logger.info("Setup complete");
        this.isSetupComplete = true;
        this.emit({ type: "setup_complete" });
        return;
      }

      // Server content (audio/text response)
      if (message.serverContent) {
        const content = message.serverContent;

        // Check for turn complete
        if (content.turnComplete) {
          logger.debug("Turn complete");
          this.emit({ type: "turn_complete" });
          return;
        }

        // Check for interruption
        if (content.interrupted) {
          logger.debug("Interrupted");
          this.emit({ type: "interrupted" });
          return;
        }

        // Process model turn parts
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            // Audio data
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              this.emit({
                type: "audio_data",
                data: part.inlineData.data,
              });
            }
            // Text data
            if (part.text) {
              this.emit({
                type: "text",
                text: part.text,
                isFinal: !!content.turnComplete,
              });
            }
          }
        }
        return;
      }

      // Error
      if (message.error) {
        logger.error("Server error", { error: message.error });
        this.emit({
          type: "error",
          message: message.error.message || JSON.stringify(message.error),
        });
        return;
      }

      logger.debug("Unhandled message", { message });
    } catch (error) {
      logger.error("Failed to parse message", { error });
    }
  }

  /**
   * 发送音频数据 (PCM 16-bit, 16kHz, mono)
   */
  sendAudio(audioBase64: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send audio: WebSocket not connected");
      return false;
    }

    if (!this.isSetupComplete) {
      logger.warn("Cannot send audio: Setup not complete");
      return false;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: "audio/pcm;rate=16000",
          data: audioBase64,
        }],
      },
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * 发送文本消息
   */
  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send text: WebSocket not connected");
      return false;
    }

    if (!this.isSetupComplete) {
      logger.warn("Cannot send text: Setup not complete");
      return false;
    }

    const message = {
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    };

    logger.info("Sending text", { textLength: text.length });
    this.send(message);
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
    this.isSetupComplete = false;
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
  private emit(event: GeminiLiveEvent) {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  /**
   * 检查是否已连接并就绪
   */
  isReady(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete;
  }
}

/**
 * 从 Config 创建 Gemini Live Client
 */
export function createGeminiLiveClient(config: Config, options?: {
  systemInstruction?: string;
  voiceName?: string;
}): GeminiLiveClient | null {
  // 从配置中获取 Gemini API Key
  const apiKey = config.models?.gemini?.apiKey;

  if (!apiKey) {
    logger.error("Gemini API key not configured. Set models.gemini.apiKey in config.");
    return null;
  }

  return new GeminiLiveClient({
    apiKey,
    model: config.models?.gemini?.liveModel || "gemini-2.0-flash-live-001",
    systemInstruction: options?.systemInstruction || config.agent?.systemPrompt,
    voiceName: options?.voiceName || "Puck",
  });
}
