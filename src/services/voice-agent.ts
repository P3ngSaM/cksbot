/**
 * Voice Agent Service - 语音 Agent 服务
 *
 * 架构：ASR + Agent + TTS 分离
 * 1. Qwen ASR Realtime 实时识别用户语音
 * 2. 识别完成后发给 Agent（带工具能力）
 * 3. Agent 回复后用 Qwen TTS Realtime 合成语音
 *
 * 参考文档:
 * - ASR: https://help.aliyun.com/zh/model-studio/qwen-real-time-speech-recognition
 * - TTS: https://help.aliyun.com/zh/model-studio/qwen-tts-realtime
 */

import WebSocket from "ws";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/schema.js";
import { runAgent } from "../agents/runner.js";
import { createDefaultTools } from "../agents/tools/common.js";
import { getSystemPrompt } from "../agents/system-prompt.js";

const logger = createLogger("voice-agent");

/**
 * Voice Agent 事件类型
 */
export type VoiceAgentEvent =
  | { type: "connected" }
  | { type: "ready" }
  | { type: "listening" }  // 开始监听用户语音
  | { type: "user_speaking" }  // 用户正在说话
  | { type: "user_transcript"; text: string; isFinal: boolean }  // 用户语音转写
  | { type: "thinking" }  // Agent 正在思考
  | { type: "agent_text"; text: string; isFinal: boolean }  // Agent 回复文本
  | { type: "audio_data"; data: string }  // TTS 音频数据 (base64 PCM)
  | { type: "speaking" }  // 正在播放语音
  | { type: "turn_complete" }
  | { type: "error"; message: string }
  | { type: "disconnected" };

export type VoiceAgentEventCallback = (event: VoiceAgentEvent) => void;

/**
 * Voice Agent 配置
 */
export interface VoiceAgentConfig {
  apiKey: string;
  asrModel?: string;  // ASR 模型: qwen3-asr-flash-realtime
  ttsModel?: string;  // TTS 模型: qwen3-tts-vd-realtime
  voice?: string;  // TTS 音色
  speechRate?: number;  // 语速: 0.5-2.0, 默认 1.2
  systemPrompt?: string;
}

/**
 * Voice Agent Client
 *
 * 组合 ASR + Agent + TTS 实现语音对话
 */
export class VoiceAgentClient {
  private config: VoiceAgentConfig;
  private appConfig: Config;
  private eventCallback: VoiceAgentEventCallback | null = null;

  // ASR WebSocket (Qwen ASR Realtime)
  private asrWs: WebSocket | null = null;
  private asrReady = false;

  // TTS WebSocket (Qwen TTS Realtime)
  private ttsWs: WebSocket | null = null;
  private ttsReady = false;

  // 状态
  private sessionId: string;
  private currentTranscript = "";
  private isProcessing = false;

  constructor(config: VoiceAgentConfig, appConfig: Config, sessionId: string) {
    this.config = {
      asrModel: "qwen3-asr-flash-realtime",
      ttsModel: "qwen3-tts-flash-realtime",  // 正确的模型名
      voice: "Cherry",  // 使用与之前相同的音色
      speechRate: 1.2,  // 默认语速稍快
      ...config,
    };
    this.appConfig = appConfig;
    this.sessionId = sessionId;
  }

  /**
   * 连接 ASR 和 TTS 服务
   */
  async connect(onEvent: VoiceAgentEventCallback): Promise<void> {
    this.eventCallback = onEvent;
    this.emit({ type: "connected" });

    try {
      // 连接 ASR
      await this.connectASR();
      this.emit({ type: "ready" });
      this.emit({ type: "listening" });
    } catch (error) {
      logger.error("Failed to connect", { error });
      this.emit({ type: "error", message: (error as Error).message });
      throw error;
    }
  }

  /**
   * 连接 ASR (语音识别) 服务 - 使用 Qwen ASR Realtime
   */
  private async connectASR(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Qwen ASR Realtime WebSocket endpoint
      const model = this.config.asrModel;
      const url = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${model}`;

      logger.info("Connecting to ASR service", { model, url });

      this.asrWs = new WebSocket(url, {
        headers: {
          "Authorization": `bearer ${this.config.apiKey}`,
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error("ASR connection timeout"));
      }, 10000);

      this.asrWs.on("open", () => {
        clearTimeout(timeout);
        logger.info("ASR WebSocket connected, sending session.update");
        this.sendASRSessionUpdate();
      });

      this.asrWs.on("message", (data) => {
        this.handleASRMessage(data, resolve, reject);
      });

      this.asrWs.on("error", (error) => {
        clearTimeout(timeout);
        logger.error("ASR WebSocket error", { error: error.message });
        reject(error);
      });

      this.asrWs.on("close", (code, reason) => {
        clearTimeout(timeout);
        logger.info("ASR WebSocket closed", { code, reason: reason.toString() });
        this.asrReady = false;
      });
    });
  }

  /**
   * 发送 ASR session.update 消息
   */
  private sendASRSessionUpdate() {
    const sessionUpdate = {
      type: "session.update",
      session: {
        // 输入音频格式: pcm (不是 pcm16)
        input_audio_format: "pcm",
        // VAD 配置 (自动检测语音边界)
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,  // 稍长一点的静音检测
        },
      },
    };

    logger.info("Sending ASR session.update");
    this.asrWs?.send(JSON.stringify(sessionUpdate));
  }

  /**
   * 处理 ASR 消息
   */
  private handleASRMessage(data: WebSocket.RawData, resolve: () => void, reject: (e: Error) => void) {
    try {
      const message = JSON.parse(data.toString());
      logger.debug("ASR message", { type: message.type });

      switch (message.type) {
        case "session.created":
          logger.info("ASR session created");
          break;

        case "session.updated":
          logger.info("ASR session updated, ready to receive audio");
          this.asrReady = true;
          resolve();
          break;

        case "input_audio_buffer.speech_started":
          logger.debug("Speech started (VAD)");
          this.emit({ type: "user_speaking" });
          this.currentTranscript = "";
          break;

        case "input_audio_buffer.speech_stopped":
          logger.debug("Speech stopped (VAD)");
          break;

        case "conversation.item.input_audio_transcription.delta":
          // 流式转写
          if (message.delta) {
            this.currentTranscript = message.delta;
            this.emit({ type: "user_transcript", text: this.currentTranscript, isFinal: false });
          }
          break;

        case "conversation.item.input_audio_transcription.completed":
          // 转写完成
          if (message.transcript) {
            logger.info("ASR transcript completed", { transcript: message.transcript });
            this.emit({ type: "user_transcript", text: message.transcript, isFinal: true });

            // 用户说完一句话，发送给 Agent
            if (!this.isProcessing && message.transcript.trim()) {
              this.processUserInput(message.transcript);
            }
          }
          break;

        case "error":
          logger.error("ASR error", { error: message.error });
          this.emit({ type: "error", message: message.error?.message || "ASR error" });
          reject(new Error(message.error?.message || "ASR error"));
          break;

        default:
          logger.debug("Unhandled ASR message", { type: message.type });
      }
    } catch (error) {
      logger.error("Failed to parse ASR message", { error });
    }
  }

  /**
   * 连接 TTS (语音合成) 服务 - 使用 Qwen TTS Realtime
   */
  private async connectTTS(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Qwen TTS Realtime WebSocket endpoint
      const model = this.config.ttsModel;
      const url = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${model}`;

      logger.info("Connecting to TTS service", { model, url, voice: this.config.voice });

      this.ttsWs = new WebSocket(url, {
        headers: {
          "Authorization": `bearer ${this.config.apiKey}`,
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error("TTS connection timeout"));
      }, 10000);

      this.ttsWs.on("open", () => {
        clearTimeout(timeout);
        logger.info("TTS WebSocket connected, sending session.update");
        this.sendTTSSessionUpdate();
      });

      this.ttsWs.on("message", (data) => {
        this.handleTTSMessage(data, resolve);
      });

      this.ttsWs.on("error", (error) => {
        clearTimeout(timeout);
        logger.error("TTS WebSocket error", { error: error.message });
        reject(error);
      });

      this.ttsWs.on("close", (code, reason) => {
        clearTimeout(timeout);
        logger.info("TTS WebSocket closed", { code, reason: reason.toString() });
        this.ttsReady = false;
      });
    });
  }

  /**
   * 发送 TTS session.update 消息
   */
  private sendTTSSessionUpdate() {
    const sessionUpdate = {
      type: "session.update",
      session: {
        // 会话模式: commit (客户端控制提交)
        mode: "commit",
        // 音色
        voice: this.config.voice,
        // 语速: 0.5-2.0, 默认 1.2 稍快
        speech_rate: this.config.speechRate ?? 1.2,
        // 输出音频格式
        response_format: "pcm",
        sample_rate: 24000,
      },
    };

    logger.info("Sending TTS session.update", { voice: this.config.voice, speechRate: this.config.speechRate, mode: "commit" });
    this.ttsWs?.send(JSON.stringify(sessionUpdate));
  }

  /**
   * 处理 TTS 消息
   */
  private handleTTSMessage(data: WebSocket.RawData, resolve: () => void) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "session.created":
          logger.info("TTS session created");
          break;

        case "session.updated":
          logger.info("TTS session updated");
          this.ttsReady = true;
          resolve();
          break;

        case "input_text_buffer.committed":
          logger.debug("TTS text committed");
          break;

        case "response.created":
        case "response.output_item.added":
        case "response.content_part.added":
          // 这些是中间状态事件，忽略
          break;

        // TTS 音频数据
        case "response.audio.delta":
          if (message.delta) {
            this.emit({ type: "audio_data", data: message.delta });
          }
          break;

        // 音频完成
        case "response.audio.done":
          logger.debug("TTS audio stream done");
          break;

        case "response.content_part.done":
        case "response.output_item.done":
          // 中间完成事件，忽略
          break;

        // 整个响应完成
        case "response.done":
          logger.info("TTS response done, turn complete");
          this.emit({ type: "turn_complete" });
          this.emit({ type: "listening" });
          this.isProcessing = false;
          // 关闭 TTS 连接
          this.closeTTS();
          break;

        case "error":
          logger.error("TTS error", { error: message.error });
          this.emit({ type: "error", message: message.error?.message || "TTS error" });
          this.isProcessing = false;
          this.closeTTS();
          break;

        default:
          logger.debug("Unhandled TTS message", { type: message.type });
      }
    } catch (error) {
      logger.error("Failed to parse TTS message", { error });
    }
  }

  /**
   * 关闭 TTS 连接
   */
  private closeTTS() {
    if (this.ttsWs) {
      this.ttsWs.close();
      this.ttsWs = null;
      this.ttsReady = false;
    }
  }

  /**
   * 处理用户输入 - 调用 Agent
   */
  private async processUserInput(text: string) {
    if (!text.trim()) return;

    this.isProcessing = true;
    this.emit({ type: "thinking" });

    try {
      logger.info("Processing user input", { text });

      // 调用 Agent
      const tools = await createDefaultTools(this.appConfig);
      const systemPrompt = this.config.systemPrompt || getSystemPrompt(this.appConfig);

      const response = await runAgent({
        sessionId: this.sessionId,
        tools,
        systemPrompt: systemPrompt + "\n\n注意：你正在通过语音与用户对话，请用简洁口语化的方式回复，不要使用 markdown 格式。",
        userMessage: text,
        config: this.appConfig,
      });

      logger.info("Agent response", { content: response.content.substring(0, 100) });

      // 发送 Agent 回复文本
      this.emit({ type: "agent_text", text: response.content, isFinal: true });

      // 使用 TTS 合成语音
      await this.synthesizeSpeech(response.content);

    } catch (error) {
      logger.error("Failed to process user input", { error });
      this.emit({ type: "error", message: (error as Error).message });
      this.isProcessing = false;
      this.emit({ type: "listening" });
    }
  }

  /**
   * TTS 合成语音
   */
  private async synthesizeSpeech(text: string) {
    try {
      // 每次合成新建 TTS 连接
      await this.connectTTS();

      if (!this.ttsWs || this.ttsWs.readyState !== WebSocket.OPEN) {
        logger.warn("TTS WebSocket not connected");
        this.isProcessing = false;
        this.emit({ type: "listening" });
        return;
      }

      this.emit({ type: "speaking" });

      // 1. 使用 input_text_buffer.append 添加文本到缓冲区
      const appendMessage = {
        type: "input_text_buffer.append",
        text: text,
      };
      logger.info("Sending TTS text (append)", { textLength: text.length });
      this.ttsWs.send(JSON.stringify(appendMessage));

      // 2. 使用 input_text_buffer.commit 提交文本触发合成
      const commitMessage = {
        type: "input_text_buffer.commit",
      };
      logger.info("Sending TTS commit");
      this.ttsWs.send(JSON.stringify(commitMessage));

    } catch (error) {
      logger.error("TTS synthesis failed", { error });
      this.emit({ type: "error", message: (error as Error).message });
      this.isProcessing = false;
      this.emit({ type: "listening" });
    }
  }

  /**
   * 发送音频数据 (PCM 16-bit, 16kHz, mono)
   */
  sendAudio(audioBase64: string) {
    if (!this.asrWs || this.asrWs.readyState !== WebSocket.OPEN || !this.asrReady) {
      return false;
    }

    if (this.isProcessing) {
      // Agent 正在处理，不接收新的音频
      return false;
    }

    // 发送音频数据
    const audioMessage = {
      type: "input_audio_buffer.append",
      audio: audioBase64,
    };

    this.asrWs.send(JSON.stringify(audioMessage));
    return true;
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.asrWs) {
      // 发送结束消息
      if (this.asrWs.readyState === WebSocket.OPEN) {
        this.asrWs.send(JSON.stringify({ type: "session.close" }));
      }
      this.asrWs.close();
      this.asrWs = null;
    }

    this.closeTTS();

    this.asrReady = false;
    this.isProcessing = false;
  }

  private emit(event: VoiceAgentEvent) {
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  isReady(): boolean {
    return this.asrReady;
  }
}

/**
 * 从 Config 创建 Voice Agent Client
 */
export function createVoiceAgentClient(
  config: Config,
  sessionId: string,
  options?: {
    systemPrompt?: string;
    voice?: string;
  }
): VoiceAgentClient | null {
  const apiKey = config.models?.qwen?.apiKey;

  if (!apiKey) {
    logger.error("Qwen API key not configured");
    return null;
  }

  return new VoiceAgentClient(
    {
      apiKey,
      voice: options?.voice || config.models?.qwen?.voice || "Cherry",
      speechRate: config.models?.qwen?.speechRate ?? 1.2,  // 默认 1.2 倍速
      systemPrompt: options?.systemPrompt,
    },
    config,
    sessionId
  );
}
