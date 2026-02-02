/**
 * Speech Service - 语音合成(TTS)和语音识别(STT)
 * 支持多种后端：MiniMax TTS, Edge TTS, OpenAI TTS, macOS系统TTS
 */

import { execSync, spawn } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Config, SpeechConfig } from "../config/schema.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("speech");

/**
 * TTS Result
 */
export interface TTSResult {
  success: boolean;
  audioPath?: string;
  audioData?: Buffer;
  error?: string;
}

/**
 * STT Result
 */
export interface STTResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

/**
 * Speech Service class
 */
export class SpeechService {
  private config: SpeechConfig;
  private mainConfig: Config;

  constructor(config: Config) {
    this.mainConfig = config;
    this.config = config.models?.speech ?? {
      tts: { provider: "edge", voice: "zh-CN-XiaoxiaoNeural", model: "speech-02-hd", speed: 1.0 },
      stt: { provider: "system", model: "whisper-1", language: "zh" },
      realtime: { voice: "female-shaonv", model: "speech-02-hd", baseUrl: "wss://api.minimaxi.com/ws/v1/t2a_v2" },
    };
  }

  /**
   * Text to Speech - 文字转语音
   */
  async textToSpeech(text: string, options?: {
    voice?: string;
    speed?: number;
    emotion?: string;
    outputPath?: string;
  }): Promise<TTSResult> {
    const provider = this.config.tts.provider;
    const voice = options?.voice ?? this.config.tts.voice;
    const speed = options?.speed ?? this.config.tts.speed;
    const outputPath = options?.outputPath ?? join(tmpdir(), `tts_${Date.now()}.mp3`);

    logger.info("TTS request", { provider, voice, textLength: text.length });

    try {
      switch (provider) {
        case "minimax":
          return await this.minimaxTTS(text, voice, speed, options?.emotion, outputPath);
        case "edge":
          return await this.edgeTTS(text, voice, speed, outputPath);
        case "openai":
          return await this.openaiTTS(text, voice, speed, outputPath);
        case "system":
          return await this.systemTTS(text, voice, speed, outputPath);
        default:
          return { success: false, error: `Unknown TTS provider: ${provider}` };
      }
    } catch (error: any) {
      logger.error("TTS failed", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Speech to Text - 语音转文字
   */
  async speechToText(audioPath: string, options?: {
    language?: string;
  }): Promise<STTResult> {
    const provider = this.config.stt.provider;
    const language = options?.language ?? this.config.stt.language;

    logger.info("STT request", { provider, audioPath, language });

    try {
      switch (provider) {
        case "openai":
          return await this.openaiSTT(audioPath, language);
        case "whisper":
          return await this.whisperSTT(audioPath, language);
        case "system":
          return await this.systemSTT(audioPath, language);
        default:
          return { success: false, error: `Unknown STT provider: ${provider}` };
      }
    } catch (error: any) {
      logger.error("STT failed", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * MiniMax TTS - 使用 MiniMax speech-02-hd / speech-2.8-hd 模型
   * API: https://api.minimaxi.chat/v1/t2a_v2 (中国大陆)
   *      https://api.minimax.io/v1/t2a_v2 (全球)
   */
  private async minimaxTTS(
    text: string,
    voice: string,
    speed: number,
    emotion: string | undefined,
    outputPath: string
  ): Promise<TTSResult> {
    // 使用 anthropic 配置中的 apiKey (因为已经配置了 minimax)
    const apiKey = this.config.tts.apiKey || this.mainConfig.models?.anthropic?.apiKey;
    const baseUrl = this.config.tts.baseUrl || "https://api.minimaxi.chat/v1/t2a_v2";
    const model = this.config.tts.model || "speech-02-hd";

    if (!apiKey) {
      return { success: false, error: "MiniMax API key not configured for TTS" };
    }

    try {
      // MiniMax TTS API 请求体
      const requestBody: Record<string, unknown> = {
        model: model,
        text: text,
        voice_setting: {
          voice_id: voice,
          speed: speed,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          format: "mp3",
          sample_rate: 32000,
        },
      };

      // 添加情感参数（如果指定）
      if (emotion) {
        (requestBody["voice_setting"] as Record<string, unknown>)["emotion"] = emotion;
      }

      logger.debug("MiniMax TTS request", { baseUrl, model, voice });

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("MiniMax TTS error", { status: response.status, error: errorText });
        return { success: false, error: `MiniMax TTS error: ${response.status} - ${errorText}` };
      }

      // MiniMax 返回 JSON，包含 base64 编码的音频
      const result = await response.json() as {
        audio_file?: string;
        base_resp?: { status_code: number; status_msg: string };
        data?: { audio?: string };
      };

      // 检查响应格式
      let audioBase64 = result.audio_file || result.data?.audio;

      if (!audioBase64) {
        // 可能返回的是流式数据或其他格式
        logger.error("MiniMax TTS unexpected response", { result });
        return { success: false, error: "MiniMax TTS returned unexpected format" };
      }

      // 解码并保存
      const audioBuffer = Buffer.from(audioBase64, "base64");
      writeFileSync(outputPath, audioBuffer);

      return {
        success: true,
        audioPath: outputPath,
        audioData: audioBuffer,
      };
    } catch (error: any) {
      logger.error("MiniMax TTS failed", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Edge TTS - 使用微软Edge TTS (免费)
   * 需要安装: pip install edge-tts
   */
  private async edgeTTS(text: string, voice: string, speed: number, outputPath: string): Promise<TTSResult> {
    return new Promise((resolve) => {
      // 检查edge-tts是否安装
      try {
        execSync("which edge-tts", { encoding: "utf-8" });
      } catch {
        // 尝试安装
        try {
          logger.info("Installing edge-tts...");
          execSync("pip3 install edge-tts", { encoding: "utf-8" });
        } catch (installError) {
          resolve({
            success: false,
            error: "edge-tts not installed. Run: pip3 install edge-tts",
          });
          return;
        }
      }

      // 速度参数转换 (1.0 = 正常, 0.5 = 慢, 2.0 = 快)
      const ratePercent = Math.round((speed - 1) * 100);
      const rateArg = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

      const args = [
        "--voice", voice,
        "--rate", rateArg,
        "--text", text,
        "--write-media", outputPath,
      ];

      const proc = spawn("edge-tts", args);
      let stderr = "";

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0 && existsSync(outputPath)) {
          resolve({
            success: true,
            audioPath: outputPath,
            audioData: readFileSync(outputPath),
          });
        } else {
          resolve({
            success: false,
            error: stderr || `edge-tts exited with code ${code}`,
          });
        }
      });

      proc.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  /**
   * OpenAI TTS
   */
  private async openaiTTS(text: string, voice: string, speed: number, outputPath: string): Promise<TTSResult> {
    const apiKey = this.config.tts.apiKey;
    const baseUrl = this.config.tts.baseUrl ?? "https://api.openai.com/v1";

    if (!apiKey) {
      return { success: false, error: "OpenAI API key not configured for TTS" };
    }

    try {
      const response = await fetch(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: voice || "alloy",
          speed: speed,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `OpenAI TTS error: ${error}` };
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(outputPath, audioBuffer);

      return {
        success: true,
        audioPath: outputPath,
        audioData: audioBuffer,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * macOS System TTS using say command
   */
  private async systemTTS(text: string, voice: string, speed: number, outputPath: string): Promise<TTSResult> {
    try {
      // macOS say command
      // -v voice: 选择声音
      // -r rate: 语速 (words per minute, 默认 ~200)
      // -o file: 输出到文件
      const rate = Math.round(200 * speed);
      const aiffPath = outputPath.replace(/\.mp3$/, ".aiff");

      // macOS voices for Chinese: Tingting, Meijia
      const macVoice = voice.includes("CN") ? "Tingting" : voice;

      execSync(`say -v "${macVoice}" -r ${rate} -o "${aiffPath}" "${text.replace(/"/g, '\\"')}"`, {
        timeout: 30000,
      });

      // Convert AIFF to MP3 using ffmpeg if available
      try {
        execSync(`ffmpeg -y -i "${aiffPath}" "${outputPath}" 2>/dev/null`, { timeout: 30000 });
        unlinkSync(aiffPath);
      } catch {
        // If ffmpeg not available, just use AIFF
        if (existsSync(aiffPath)) {
          return {
            success: true,
            audioPath: aiffPath,
            audioData: readFileSync(aiffPath),
          };
        }
      }

      if (existsSync(outputPath)) {
        return {
          success: true,
          audioPath: outputPath,
          audioData: readFileSync(outputPath),
        };
      }

      return { success: false, error: "TTS output file not created" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * OpenAI Whisper STT
   */
  private async openaiSTT(audioPath: string, language: string): Promise<STTResult> {
    const apiKey = this.config.stt.apiKey;
    const baseUrl = this.config.stt.baseUrl ?? "https://api.openai.com/v1";
    const model = this.config.stt.model;

    if (!apiKey) {
      return { success: false, error: "OpenAI API key not configured for STT" };
    }

    try {
      const audioData = readFileSync(audioPath);
      const formData = new FormData();
      formData.append("file", new Blob([audioData]), "audio.mp3");
      formData.append("model", model);
      formData.append("language", language);

      const response = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `OpenAI STT error: ${error}` };
      }

      const result = await response.json() as { text: string };
      return {
        success: true,
        text: result.text,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Local Whisper STT (需要安装 whisper)
   * pip install openai-whisper
   */
  private async whisperSTT(audioPath: string, language: string): Promise<STTResult> {
    try {
      // 检查whisper是否安装
      execSync("which whisper", { encoding: "utf-8" });

      const model = this.config.stt.model || "base";
      const output = execSync(
        `whisper "${audioPath}" --model ${model} --language ${language} --output_format txt`,
        { encoding: "utf-8", timeout: 60000 }
      );

      // Whisper outputs to a .txt file
      const txtPath = audioPath.replace(/\.[^.]+$/, ".txt");
      if (existsSync(txtPath)) {
        const text = readFileSync(txtPath, "utf-8").trim();
        unlinkSync(txtPath);
        return { success: true, text };
      }

      return { success: true, text: output.trim() };
    } catch (error: any) {
      return {
        success: false,
        error: `Whisper not installed or failed: ${error.message}. Run: pip install openai-whisper`,
      };
    }
  }

  /**
   * macOS System STT using whisper.cpp or online service
   * Fallback: 使用 OpenAI Whisper API 或提示安装 whisper
   */
  private async systemSTT(audioPath: string, language: string): Promise<STTResult> {
    // 方法1: 尝试使用本地 whisper (如果安装了)
    try {
      const whisperResult = await this.whisperSTT(audioPath, language);
      if (whisperResult.success) {
        return whisperResult;
      }
    } catch {
      // whisper 不可用，继续尝试其他方法
    }

    // 方法2: 使用 macOS 的 say 命令的反向功能不存在
    // 尝试使用 SpeechRecognition Python 库
    try {
      // 检查是否有 speech_recognition 库
      const checkScript = `python3 -c "import speech_recognition" 2>/dev/null && echo "ok"`;
      try {
        execSync(checkScript, { encoding: "utf-8" });
      } catch {
        // 尝试安装
        logger.info("Installing speech_recognition...");
        execSync("pip3 install SpeechRecognition pydub", { timeout: 60000 });
      }

      // 使用 speech_recognition 进行识别 (使用 Google 免费 API)
      const pythonScript = `
import speech_recognition as sr
import sys

def transcribe(path, lang):
    recognizer = sr.Recognizer()

    # 支持多种音频格式
    try:
        with sr.AudioFile(path) as source:
            audio = recognizer.record(source)
    except Exception as e:
        # 如果格式不支持，尝试用 ffmpeg 转换
        import subprocess
        import tempfile
        wav_path = tempfile.mktemp(suffix=".wav")
        subprocess.run(["ffmpeg", "-y", "-i", path, "-ar", "16000", "-ac", "1", wav_path],
                      capture_output=True, timeout=30)
        with sr.AudioFile(wav_path) as source:
            audio = recognizer.record(source)

    # 使用 Google Speech Recognition (免费)
    try:
        text = recognizer.recognize_google(audio, language=lang)
        return text
    except sr.UnknownValueError:
        return "无法识别语音"
    except sr.RequestError as e:
        return f"识别服务错误: {e}"

print(transcribe("${audioPath}", "${language === "zh" ? "zh-CN" : language}"))
`;

      const result = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\"'\"'")}'`, {
        encoding: "utf-8",
        timeout: 60000,
      }).trim();

      if (result.startsWith("识别服务错误") || result === "无法识别语音") {
        return { success: false, error: result };
      }

      return { success: true, text: result };
    } catch (error: any) {
      logger.warn("speech_recognition failed", { error: error.message });
    }

    // 方法3: 提示用户
    return {
      success: false,
      error: `语音识别需要安装依赖。请运行: pip3 install SpeechRecognition pydub openai-whisper\n或配置 OpenAI API 使用 Whisper。`,
    };
  }

  /**
   * 获取可用的 TTS 声音列表
   */
  async getAvailableVoices(): Promise<string[]> {
    const provider = this.config.tts.provider;

    switch (provider) {
      case "minimax":
        // MiniMax 预设语音列表
        return [
          // 中文女声
          "Wise_Woman",
          "Gentle_Woman",
          "Sweet_Girl_1",
          "Sweet_Girl_2",
          "Cute_Girl",
          "Lively_Girl",
          // 中文男声
          "Deep_Voice_Man",
          "Steady_Man",
          "Young_Man",
          "Sunshine_Man",
          // 英文
          "Friendly_Person",
          "Inspirational_girl",
          "Deep_Voice_Man_EN",
          // 特色音色
          "Newsboy",
          "Cartoon_Girl",
          "Audiobook_Male",
          "Audiobook_Female",
        ];

      case "edge":
        try {
          const output = execSync("edge-tts --list-voices", { encoding: "utf-8" });
          const voices = output.split("\n")
            .filter(line => line.includes("Name:"))
            .map(line => line.replace("Name:", "").trim());
          return voices;
        } catch {
          return [
            "zh-CN-XiaoxiaoNeural",
            "zh-CN-YunxiNeural",
            "zh-CN-YunjianNeural",
            "zh-TW-HsiaoChenNeural",
            "en-US-JennyNeural",
            "en-US-GuyNeural",
          ];
        }

      case "openai":
        return ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

      case "system":
        try {
          const output = execSync("say -v '?'", { encoding: "utf-8" });
          const voices = output.split("\n")
            .filter(line => line.trim())
            .map(line => line.split(/\s+/)[0])
            .filter((v): v is string => v !== undefined);
          return voices;
        } catch {
          return ["Tingting", "Meijia", "Alex", "Samantha"];
        }

      default:
        return [];
    }
  }
}

// Singleton instance
let speechServiceInstance: SpeechService | null = null;

export function getSpeechService(config: Config): SpeechService {
  if (!speechServiceInstance) {
    speechServiceInstance = new SpeechService(config);
  }
  return speechServiceInstance;
}

export function resetSpeechService(): void {
  speechServiceInstance = null;
}
