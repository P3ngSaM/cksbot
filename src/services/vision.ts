/**
 * Vision Service - 视觉分析服务
 * 使用多模态模型（Claude Vision/GPT-4V）分析图片
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../config/schema.js";
import { getAnthropicClient } from "../agents/providers/anthropic.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("vision");

/**
 * Vision analysis result
 */
export interface VisionResult {
  success: boolean;
  description?: string;
  extractedText?: string;
  objects?: string[];
  error?: string;
}

/**
 * Vision Service class
 */
export class VisionService {
  private config: Config;
  private client: Anthropic | null = null;

  constructor(config: Config) {
    this.config = config;
    try {
      this.client = getAnthropicClient(config);
    } catch {
      logger.warn("Anthropic client not available for vision");
    }
  }

  /**
   * 分析图片内容
   */
  async analyzeImage(imagePath: string, options?: {
    prompt?: string;
    extractText?: boolean;
    detectObjects?: boolean;
  }): Promise<VisionResult> {
    const prompt = options?.prompt ?? "请详细描述这张图片的内容";
    const extractText = options?.extractText ?? true;

    logger.info("Analyzing image", { imagePath, extractText });

    try {
      // 读取图片
      if (!existsSync(imagePath)) {
        return { success: false, error: `Image not found: ${imagePath}` };
      }

      const imageData = readFileSync(imagePath);
      const base64 = imageData.toString("base64");
      const mediaType = this.getMediaType(imagePath);

      // 使用 Claude Vision 分析
      if (this.client) {
        return await this.analyzeWithClaude(base64, mediaType, prompt, extractText);
      }

      // Fallback: 使用 macOS OCR
      return await this.analyzeWithLocalOCR(imagePath);
    } catch (error: any) {
      logger.error("Vision analysis failed", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 截图并分析
   */
  async screenshotAndAnalyze(options?: {
    prompt?: string;
    region?: { x: number; y: number; width: number; height: number };
    display?: number;
  }): Promise<VisionResult & { screenshotPath?: string }> {
    try {
      const timestamp = Date.now();
      const filepath = join(tmpdir(), `screenshot_${timestamp}.png`);

      // 截图
      let command = `screencapture -x "${filepath}"`;
      if (options?.display !== undefined) {
        command = `screencapture -x -D ${options.display} "${filepath}"`;
      }
      if (options?.region) {
        const { x, y, width, height } = options.region;
        command = `screencapture -x -R${x},${y},${width},${height} "${filepath}"`;
      }

      logger.debug("Taking screenshot", { command });
      execSync(command, { timeout: 10000 });

      if (!existsSync(filepath)) {
        return { success: false, error: "Screenshot failed" };
      }

      // 分析截图
      const result = await this.analyzeImage(filepath, {
        prompt: options?.prompt ?? "这是一张屏幕截图，请描述屏幕上显示的内容，包括可见的文字、应用程序、按钮等元素。",
        extractText: true,
      });

      return { ...result, screenshotPath: filepath };
    } catch (error: any) {
      logger.error("Screenshot and analyze failed", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 使用 Claude Vision 分析图片
   */
  private async analyzeWithClaude(
    base64: string,
    mediaType: string,
    prompt: string,
    extractText: boolean
  ): Promise<VisionResult> {
    if (!this.client) {
      return { success: false, error: "Anthropic client not available" };
    }

    try {
      const systemPrompt = extractText
        ? "你是一个视觉分析助手。请仔细分析图片，描述其内容，并提取图片中所有可见的文字。"
        : "你是一个视觉分析助手。请仔细分析图片并描述其内容。";

      const response = await this.client.messages.create({
        model: this.config.models?.vision?.model ?? this.config.agent.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: base64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const textContent = response.content
        .filter(block => block.type === "text")
        .map(block => (block as { type: "text"; text: string }).text)
        .join("\n");

      // 解析提取的文字（如果AI在回复中单独列出）
      let extractedText: string | undefined;
      const textMatch = textContent.match(/提取的文字[:：]?\n?([\s\S]*?)(?:\n\n|$)/i);
      if (textMatch && textMatch[1]) {
        extractedText = textMatch[1].trim();
      }

      return {
        success: true,
        description: textContent,
        extractedText,
      };
    } catch (error: any) {
      logger.error("Claude Vision failed", { error: error.message });
      // Fallback to local OCR
      return { success: false, error: error.message };
    }
  }

  /**
   * 使用本地 OCR (macOS Vision framework)
   */
  private async analyzeWithLocalOCR(imagePath: string): Promise<VisionResult> {
    try {
      const pythonScript = `
import Quartz
from Foundation import NSURL
import Vision

def ocr_image(path):
    url = NSURL.fileURLWithPath_(path)
    image_source = Quartz.CGImageSourceCreateWithURL(url, None)
    if not image_source:
        return ""

    cg_image = Quartz.CGImageSourceCreateImageAtIndex(image_source, 0, None)
    if not cg_image:
        return ""

    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    request.setRecognitionLanguages_(["zh-Hans", "zh-Hant", "en"])

    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg_image, None)
    handler.performRequests_error_([request], None)

    results = request.results()
    if not results:
        return ""

    texts = []
    for observation in results:
        text = observation.topCandidates_(1)[0].string()
        texts.append(text)

    return "\\n".join(texts)

print(ocr_image("${imagePath}"))
`;

      const ocrText = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\"'\"'")}'`, {
        encoding: "utf-8",
        timeout: 30000,
      }).trim();

      return {
        success: true,
        description: "使用本地 OCR 提取的文字内容",
        extractedText: ocrText || "未识别到文字",
      };
    } catch (error: any) {
      // Try tesseract as fallback
      try {
        const ocrText = execSync(`tesseract "${imagePath}" stdout -l chi_sim+eng 2>/dev/null`, {
          encoding: "utf-8",
          timeout: 30000,
        }).trim();

        return {
          success: true,
          description: "使用 Tesseract OCR 提取的文字内容",
          extractedText: ocrText || "未识别到文字",
        };
      } catch {
        return {
          success: false,
          error: `OCR failed: ${error.message}. Install tesseract: brew install tesseract tesseract-lang`,
        };
      }
    }
  }

  /**
   * 获取图片的 media type
   */
  private getMediaType(filepath: string): string {
    const ext = filepath.toLowerCase().split(".").pop();
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      default:
        return "image/png";
    }
  }
}

// Singleton instance
let visionServiceInstance: VisionService | null = null;

export function getVisionService(config: Config): VisionService {
  if (!visionServiceInstance) {
    visionServiceInstance = new VisionService(config);
  }
  return visionServiceInstance;
}

export function resetVisionService(): void {
  visionServiceInstance = null;
}
