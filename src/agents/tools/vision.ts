/**
 * Vision tools - 屏幕截图和视觉分析
 * 使用 screencapture (macOS) 截图，然后用视觉大模型分析
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Anthropic from "@anthropic-ai/sdk";
import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("vision-tools");

/**
 * Create vision tools
 */
export function createVisionTools(): AgentTool[] {
  return [
    createScreenshotTool(),
    createScreenshotAndDescribeTool(),
    createAnalyzeScreenTool(),
  ];
}

/**
 * Take a screenshot of the entire screen
 */
function createScreenshotTool(): AgentTool {
  return {
    name: "screenshot",
    description: `截取当前屏幕截图。返回截图文件路径。
注意：此工具只返回文件路径，不会分析图片内容。如果需要了解屏幕上显示的内容，请使用 analyze_screen 工具。`,
    inputSchema: {
      type: "object",
      properties: {
        display: {
          type: "number",
          description: "显示器编号（多显示器时使用），默认主显示器",
        },
      },
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const display = input["display"] as number | undefined;

      try {
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}.png`;
        const filepath = join(tmpdir(), filename);

        // macOS screencapture command
        let command = `screencapture -x "${filepath}"`;
        if (display !== undefined) {
          command = `screencapture -x -D ${display} "${filepath}"`;
        }

        logger.debug("Taking screenshot", { command });
        execSync(command, { timeout: 10000 });

        if (!existsSync(filepath)) {
          return {
            success: false,
            error: "截图失败：文件未生成",
          };
        }

        // Get file size
        const stats = readFileSync(filepath);

        return {
          success: true,
          result: {
            path: filepath,
            size: stats.length,
            hint: "截图已保存。如需了解屏幕内容，请使用 analyze_screen 工具。",
          },
        };
      } catch (error: any) {
        logger.error("Screenshot failed", { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Take a screenshot and use OCR to extract text
 */
function createScreenshotAndDescribeTool(): AgentTool {
  return {
    name: "screenshot_and_describe",
    description: `截取屏幕截图并使用 OCR 识别文字。返回屏幕上可见的文本内容。
注意：这只是简单的 OCR 文字识别。如果需要理解屏幕布局、找到特定元素位置，请使用 analyze_screen 工具。`,
    inputSchema: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "要关注的区域描述（可选）",
        },
      },
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      try {
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}.png`;
        const filepath = join(tmpdir(), filename);

        // Take screenshot
        logger.debug("Taking screenshot for OCR", { filepath });
        execSync(`screencapture -x "${filepath}"`, { timeout: 10000 });

        if (!existsSync(filepath)) {
          return {
            success: false,
            error: "截图失败：文件未生成",
          };
        }

        // Use macOS Vision framework for OCR
        let ocrText = "";

        try {
          const pythonScript = `
import Quartz
from Foundation import NSURL
import Vision

def ocr_image(path):
    url = NSURL.fileURLWithPath_(path)
    image_source = Quartz.CGImageSourceCreateWithURL(url, None)
    if not image_source:
        return "无法加载图片"

    cg_image = Quartz.CGImageSourceCreateImageAtIndex(image_source, 0, None)
    if not cg_image:
        return "无法创建图片"

    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    request.setRecognitionLanguages_(["zh-Hans", "zh-Hant", "en"])

    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg_image, None)
    success = handler.performRequests_error_([request], None)

    if not success:
        return "OCR 失败"

    results = request.results()
    if not results:
        return "未识别到文字"

    texts = []
    for observation in results:
        text = observation.topCandidates_(1)[0].string()
        texts.append(text)

    return "\\n".join(texts)

print(ocr_image("${filepath}"))
`;

          ocrText = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\"'\"'")}'`, {
            encoding: "utf-8",
            timeout: 30000,
          }).trim();
        } catch (pythonError) {
          try {
            ocrText = execSync(`tesseract "${filepath}" stdout -l chi_sim+eng 2>/dev/null`, {
              encoding: "utf-8",
              timeout: 30000,
            }).trim();
          } catch {
            ocrText = "OCR 工具不可用。请使用 analyze_screen 工具获取视觉分析。";
          }
        }

        if (ocrText.length > 5000) {
          ocrText = ocrText.substring(0, 5000) + "\n...(文字过多，已截断)";
        }

        return {
          success: true,
          result: {
            screenshotPath: filepath,
            screenContent: ocrText,
          },
        };
      } catch (error: any) {
        logger.error("Screenshot and describe failed", { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Analyze screen using Vision LLM (Claude Vision)
 * This provides full understanding of screen layout, UI elements, etc.
 */
function createAnalyzeScreenTool(): AgentTool {
  return {
    name: "analyze_screen",
    description: `使用视觉大模型分析当前屏幕内容。
这个工具会截图并使用 AI 视觉能力来：
- 识别屏幕上的所有 UI 元素（按钮、输入框、列表等）
- 理解当前应用的状态
- 找到特定的联系人或内容的位置
- 告诉你应该点击哪里或输入什么

适用场景：
- 需要知道屏幕上显示了什么
- 需要找到某个联系人在列表中的位置
- 需要确认操作是否成功`,
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "你想了解屏幕上的什么内容？例如：'列表里有哪些联系人？'、'搜索结果显示了什么？'、'当前打开的是什么应用？'",
        },
      },
      required: ["question"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const question = input["question"] as string;

      try {
        // Take screenshot
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}.png`;
        const filepath = join(tmpdir(), filename);

        logger.info("Taking screenshot for vision analysis", { filepath, question });
        execSync(`screencapture -x "${filepath}"`, { timeout: 10000 });

        if (!existsSync(filepath)) {
          return {
            success: false,
            error: "截图失败：文件未生成",
          };
        }

        // Read image and convert to base64
        const imageData = readFileSync(filepath);
        const base64Image = imageData.toString("base64");

        // Get Anthropic config
        const anthropicConfig = context.config.models.anthropic;
        if (!anthropicConfig?.apiKey) {
          return {
            success: false,
            error: "Anthropic API key not configured for vision analysis",
          };
        }

        // Create Anthropic client
        const useBearer = anthropicConfig.baseUrl?.includes("sssaicode") ||
                          anthropicConfig.baseUrl?.includes("proxy") ||
                          anthropicConfig.authType === "bearer";

        const client = useBearer
          ? new Anthropic({
              apiKey: anthropicConfig.apiKey,
              baseURL: anthropicConfig.baseUrl,
              defaultHeaders: {
                "Authorization": `Bearer ${anthropicConfig.apiKey}`,
              },
            })
          : new Anthropic({
              apiKey: anthropicConfig.apiKey,
              baseURL: anthropicConfig.baseUrl,
            });

        // Call Claude with vision
        logger.info("Calling Claude Vision API", { question });

        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",  // Use a vision-capable model
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: base64Image,
                  },
                },
                {
                  type: "text",
                  text: `这是一张 macOS 屏幕截图。请仔细分析并回答以下问题：

${question}

请用简洁的中文回答，重点描述：
1. 当前打开的应用是什么
2. 屏幕上显示的主要内容
3. 如果是聊天应用，列出可见的联系人或对话
4. 任何与用户问题相关的细节`,
                },
              ],
            },
          ],
        });

        // Extract text response
        const textContent = response.content.find(block => block.type === "text");
        const analysis = textContent && "text" in textContent ? textContent.text : "无法分析屏幕内容";

        logger.info("Vision analysis complete", { analysisLength: analysis.length });

        return {
          success: true,
          result: {
            screenshotPath: filepath,
            analysis: analysis,
          },
        };
      } catch (error: any) {
        logger.error("Vision analysis failed", { error: error.message });
        return {
          success: false,
          error: `视觉分析失败: ${error.message}`,
        };
      }
    },
  };
}
