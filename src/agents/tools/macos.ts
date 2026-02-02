/**
 * macOS automation tools - 使用 AppleScript/osascript 控制应用
 */

import { execSync } from "node:child_process";
import type { AgentTool, ToolExecutionResult } from "./common.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("macos-tools");

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create macOS automation tools
 */
export function createMacOSTools(): AgentTool[] {
  return [
    createSendMessageTool(),  // 最重要的工具放第一位
    createAppleScriptTool(),
    createOpenAppTool(),
    createOpenURLTool(),
    createGetFrontmostAppTool(),
    createTypeTextTool(),
    createKeyPressTool(),
    createClickMenuTool(),
  ];
}

/**
 * Clean Markdown formatting for messaging
 */
function cleanMarkdownForMessage(text: string): string {
  let cleaned = text;

  // Remove bold markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");

  // Remove italic markers
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove links, keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Convert list markers to bullets
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "• ");

  // Convert numbered lists
  cleaned = cleaned.replace(/^[\s]*(\d+)\.\s+/gm, "$1. ");

  // Remove excess blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Convert Chinese characters to pinyin (simplified mapping)
 */
function toPinyin(text: string): string {
  // 常见汉字拼音映射表
  const pinyinMap: Record<string, string> = {
    '刘': 'liu', '婆': 'po', '郑': 'zheng', '宁': 'ning', '欣': 'xin', '馨': 'xin',
    '张': 'zhang', '王': 'wang', '李': 'li', '赵': 'zhao', '陈': 'chen',
    '杨': 'yang', '黄': 'huang', '周': 'zhou', '吴': 'wu', '徐': 'xu',
    '孙': 'sun', '马': 'ma', '朱': 'zhu', '胡': 'hu', '林': 'lin',
    '郭': 'guo', '何': 'he', '高': 'gao', '罗': 'luo',
    '小': 'xiao', '大': 'da', '老': 'lao', '阿': 'a',
    '爸': 'ba', '妈': 'ma', '爷': 'ye', '奶': 'nai', '哥': 'ge', '姐': 'jie',
    '弟': 'di', '妹': 'mei', '叔': 'shu', '姑': 'gu', '舅': 'jiu',
    '明': 'ming', '华': 'hua', '文': 'wen', '军': 'jun', '伟': 'wei',
    '强': 'qiang', '磊': 'lei', '洋': 'yang', '勇': 'yong', '杰': 'jie',
    '娟': 'juan', '芳': 'fang', '敏': 'min', '静': 'jing', '丽': 'li',
    '秀': 'xiu', '英': 'ying', '梅': 'mei', '红': 'hong', '玲': 'ling',
    '天': 'tian', '云': 'yun', '龙': 'long', '凤': 'feng', '飞': 'fei',
    '海': 'hai', '山': 'shan', '江': 'jiang', '波': 'bo', '涛': 'tao',
    '灵': 'ling', '新': 'xin',
  };

  let pinyin = '';
  for (const char of text) {
    if (pinyinMap[char]) {
      pinyin += pinyinMap[char];
    } else if (/[\u4e00-\u9fa5]/.test(char)) {
      // 如果是汉字但不在映射表中，跳过（无法转换）
      return '';  // 返回空表示无法完全转换
    } else {
      // 非汉字字符保留
      pinyin += char;
    }
  }
  return pinyin;
}

/**
 * Search for a contact in WeChat/Lark
 * Returns the search term that was used
 */
async function searchContact(appName: string, contact: string): Promise<string> {
  // Step 1: 多次按 Escape 确保关闭所有弹窗和返回主界面
  logger.debug("Pressing Escape multiple times to reset state");
  for (let i = 0; i < 3; i++) {
    execSync(`osascript -e 'tell application "System Events" to key code 53'`, { timeout: 5000 });
    await sleep(200);
  }
  await sleep(500);

  // Step 2: 打开搜索
  logger.debug("Opening search");
  if (appName === "WeChat") {
    execSync(`osascript -e 'tell application "System Events" to keystroke "f" using {command down}'`, { timeout: 5000 });
  } else {
    execSync(`osascript -e 'tell application "System Events" to keystroke "k" using {command down}'`, { timeout: 5000 });
  }
  await sleep(1000);

  // Step 3: 输入搜索词（使用中文原名，更精确）
  const searchTerm = contact;

  logger.debug("Typing search term", { searchTerm });
  // 先全选清空
  execSync(`osascript -e 'tell application "System Events" to keystroke "a" using {command down}'`, { timeout: 5000 });
  await sleep(100);

  // 复制搜索词到剪贴板并粘贴
  const escapedTerm = searchTerm.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  execSync(`echo "${escapedTerm}" | pbcopy`, { timeout: 5000 });
  await sleep(100);
  execSync(`osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`, { timeout: 5000 });
  await sleep(2000);  // 等待搜索结果加载

  // Step 4: 按回车选择第一个结果
  logger.debug("Pressing Enter to select first result");
  execSync(`osascript -e 'tell application "System Events" to key code 36'`, { timeout: 5000 });  // Enter
  await sleep(1500);  // 等待聊天窗口打开

  return searchTerm;
}

/**
 * Send message via WeChat or Lark - 一键发送消息
 * 这个工具封装了整个发送流程，不需要用户分步操作
 */
function createSendMessageTool(): AgentTool {
  return {
    name: "send_message",
    description: `通过微信或飞书发送消息。这是发送消息的首选工具。
参数：
- app: "wechat" 或 "lark"（飞书）
- contact: 联系人名字
- message: 要发送的消息内容

示例：send_message(app="lark", contact="谢杰", message="明天有空吗")`,
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          enum: ["wechat", "lark", "feishu"],
          description: "应用：wechat（微信）, lark/feishu（飞书）",
        },
        contact: {
          type: "string",
          description: "联系人名字",
        },
        message: {
          type: "string",
          description: "消息内容",
        },
      },
      required: ["app", "contact", "message"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const appType = (input["app"] as string).toLowerCase();
      const contact = input["contact"] as string;
      let message = input["message"] as string;

      // 清理 Markdown 格式
      message = cleanMarkdownForMessage(message);

      // 确定应用名称
      const appName = appType === "wechat" ? "WeChat" : "Lark";

      try {
        logger.info("Sending message", { app: appName, contact, message });

        // Step 1: 打开应用
        logger.debug("Step 1: Opening app");
        execSync(`open -a "${appName}"`, { timeout: 10000 });
        await sleep(1500);  // 等待应用打开

        // Step 2: 激活应用
        logger.debug("Step 2: Activating app");
        execSync(`osascript -e 'tell application "${appName}" to activate'`, { timeout: 5000 });
        await sleep(800);

        // Step 3: 搜索联系人
        logger.debug("Step 3: Searching for contact", { contact });
        const usedSearchTerm = await searchContact(appName, contact);

        // Step 4: 等待聊天窗口就绪
        logger.info("Step 4: Waiting for chat window to be ready");
        await sleep(1500);

        // Step 4.5: 使用 AppleScript 确保微信窗口在最前面并激活
        logger.info("Step 4.5: Ensuring WeChat window is frontmost");
        execSync(`osascript -e 'tell application "${appName}" to activate'`, { timeout: 5000 });
        execSync(`osascript -e 'tell application "System Events" to tell process "${appName}" to set frontmost to true'`, { timeout: 5000 });
        await sleep(500);

        // Step 4.6: 点击窗口确保激活（使用坐标点击窗口中心偏下位置，通常是输入框区域）
        logger.info("Step 4.6: Clicking input area");
        try {
          // 获取窗口位置和大小
          const windowInfo = execSync(
            `osascript -e 'tell application "System Events" to tell process "${appName}" to get position of window 1'`,
            { encoding: 'utf-8', timeout: 5000 }
          ).trim();
          const windowSize = execSync(
            `osascript -e 'tell application "System Events" to tell process "${appName}" to get size of window 1'`,
            { encoding: 'utf-8', timeout: 5000 }
          ).trim();

          logger.debug("Window info", { position: windowInfo, size: windowSize });

          // 解析坐标
          const posArr = windowInfo.split(', ').map(s => parseFloat(s));
          const sizeArr = windowSize.split(', ').map(s => parseFloat(s));

          const x = posArr[0];
          const y = posArr[1];
          const width = sizeArr[0];
          const height = sizeArr[1];

          if (typeof x === 'number' && typeof y === 'number' && typeof width === 'number' && typeof height === 'number' &&
              !isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
            // 点击窗口底部偏上位置（输入框通常在这里）
            const clickX = x + width / 2;
            const clickY = y + height - 100;

            logger.info("Clicking input field", { x: clickX, y: clickY });
            execSync(`osascript -e 'tell application "System Events" to click at {${clickX}, ${clickY}}'`, { timeout: 5000 });
            await sleep(500);
          }
        } catch (error) {
          logger.warn("Failed to click input area, continuing anyway", { error });
        }

        // Step 5: 输入消息 - 使用 AppleScript keystroke
        logger.info("Step 5: Typing message character by character", { messageLength: message.length });

        // 先清空输入框
        execSync(`osascript -e 'tell application "System Events" to keystroke "a" using {command down}'`, { timeout: 5000 });
        await sleep(100);
        execSync(`osascript -e 'tell application "System Events" to key code 51'`, { timeout: 5000 }); // Delete
        await sleep(200);

        // 使用 AppleScript 的 keystroke 直接输入中文
        const escapedForAppleScript = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
        try {
          logger.info("Typing with AppleScript keystroke");
          execSync(
            `osascript -e 'tell application "System Events" to keystroke "${escapedForAppleScript}"'`,
            { timeout: 10000 }
          );
          await sleep(500);
        } catch (error) {
          logger.warn("AppleScript keystroke failed, falling back to clipboard", { error });

          // 备用方案：使用剪贴板
          const escapedMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          execSync(`printf '%s' "${escapedMessage}" | pbcopy`, { timeout: 5000 });
          await sleep(200);
          execSync(`osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`, { timeout: 5000 });
          await sleep(500);
        }

        // Step 6: 按回车发送
        logger.info("Step 6: Sending message (pressing Enter)");
        execSync(`osascript -e 'tell application "System Events" to key code 36'`, { timeout: 5000 });
        await sleep(500);

        logger.info("Message sent successfully", { usedSearchTerm });

        return {
          success: true,
          result: {
            message: `已通过${appName === "WeChat" ? "微信" : "飞书"}给"${contact}"发送消息`,
            warning: `请检查确认消息是否发送到正确的联系人。`,
          },
        };
      } catch (error: any) {
        logger.error("Failed to send message", { error: error.message });
        return {
          success: false,
          error: `发送失败: ${error.message}`,
        };
      }
    },
  };
}

/**
 * Execute AppleScript
 */
function createAppleScriptTool(): AgentTool {
  return {
    name: "applescript",
    description: `执行 AppleScript 代码来控制 macOS 应用。
示例：
- 获取 Finder 选中的文件: tell application "Finder" to get selection
- 控制系统音量: set volume output volume 50
- 显示通知: display notification "Hello" with title "FeishuPilot"`,
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "AppleScript 代码",
        },
      },
      required: ["script"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const script = input["script"] as string;

      try {
        logger.debug("Executing AppleScript", { script: script.substring(0, 100) });

        // Use osascript to execute AppleScript
        const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
          encoding: "utf-8",
          timeout: 30000,
        });

        return {
          success: true,
          result: {
            output: result.trim(),
          },
        };
      } catch (error: any) {
        logger.error("AppleScript failed", { error: error.message });
        return {
          success: false,
          error: error.message,
          result: {
            stderr: error.stderr?.toString() ?? "",
          },
        };
      }
    },
  };
}

/**
 * Open an application
 */
function createOpenAppTool(): AgentTool {
  return {
    name: "open_app",
    description: "打开 macOS 应用程序。例如：Safari, Finder, Terminal, 微信, 飞书",
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "应用名称，如 Safari, Finder, Terminal",
        },
      },
      required: ["app"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const app = input["app"] as string;

      try {
        execSync(`open -a "${app}"`, { timeout: 10000 });

        return {
          success: true,
          result: {
            message: `已打开 ${app}`,
          },
        };
      } catch (error: any) {
        logger.error("Failed to open app", { app, error: error.message });
        return {
          success: false,
          error: `无法打开应用 ${app}: ${error.message}`,
        };
      }
    },
  };
}

/**
 * Open a URL in default browser
 */
function createOpenURLTool(): AgentTool {
  return {
    name: "open_url",
    description: "在默认浏览器中打开 URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "要打开的 URL",
        },
      },
      required: ["url"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const url = input["url"] as string;

      try {
        execSync(`open "${url}"`, { timeout: 10000 });

        return {
          success: true,
          result: {
            message: `已在浏览器中打开 ${url}`,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Get frontmost application info
 */
function createGetFrontmostAppTool(): AgentTool {
  return {
    name: "get_frontmost_app",
    description: "获取当前最前面（活动）的应用程序名称",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolExecutionResult> => {
      try {
        const script = `
          tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
          end tell
          return frontApp
        `;
        const result = execSync(`osascript -e '${script}'`, {
          encoding: "utf-8",
          timeout: 5000,
        });

        return {
          success: true,
          result: {
            app: result.trim(),
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Type text using clipboard (works with Chinese and special characters)
 */
function createTypeTextTool(): AgentTool {
  return {
    name: "type_text",
    description: `在当前应用中输入文本。
支持中文和特殊字符（通过剪贴板粘贴方式实现）。
注意：这会覆盖当前剪贴板内容。`,
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "要输入的文本（支持中文）",
        },
      },
      required: ["text"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const text = input["text"] as string;

      try {
        // 使用 pbcopy 将文本复制到剪贴板，然后用 Command+V 粘贴
        // 这样可以正确处理中文和特殊字符
        execSync(`echo "${text.replace(/"/g, '\\"')}" | pbcopy`, { timeout: 5000 });

        // 等待剪贴板更新
        execSync('sleep 0.1', { timeout: 1000 });

        // 使用 Command+V 粘贴
        const pasteScript = `tell application "System Events" to keystroke "v" using {command down}`;
        execSync(`osascript -e '${pasteScript}'`, { timeout: 5000 });

        return {
          success: true,
          result: {
            message: `已输入文本: ${text}`,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Press a key combination
 */
function createKeyPressTool(): AgentTool {
  return {
    name: "key_press",
    description: `按下键盘快捷键。
示例：
- 复制: key="c", modifiers=["command"]
- 粘贴: key="v", modifiers=["command"]
- 保存: key="s", modifiers=["command"]
- 全选: key="a", modifiers=["command"]
- 回车: key="return"
- Tab: key="tab"`,
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "按键名称，如 a, return, tab, escape, space, delete",
        },
        modifiers: {
          type: "array",
          items: { type: "string" },
          description: "修饰键数组: command, control, option, shift",
        },
      },
      required: ["key"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const key = input["key"] as string;
      const modifiers = (input["modifiers"] as string[]) ?? [];

      try {
        let script: string;

        if (modifiers.length > 0) {
          const modifierStr = modifiers.map(m => `${m} down`).join(", ");
          script = `tell application "System Events" to key code (key code "${key}") using {${modifierStr}}`;

          // Simpler approach that works better
          const modifierMapping: Record<string, string> = {
            command: "command down",
            control: "control down",
            option: "option down",
            shift: "shift down",
          };

          const using = modifiers.map(m => modifierMapping[m] || `${m} down`).join(", ");
          script = `tell application "System Events" to keystroke "${key}" using {${using}}`;
        } else {
          // For special keys
          const specialKeys: Record<string, number> = {
            return: 36,
            tab: 48,
            space: 49,
            delete: 51,
            escape: 53,
            left: 123,
            right: 124,
            down: 125,
            up: 126,
          };

          if (specialKeys[key.toLowerCase()]) {
            script = `tell application "System Events" to key code ${specialKeys[key.toLowerCase()]}`;
          } else {
            script = `tell application "System Events" to keystroke "${key}"`;
          }
        }

        execSync(`osascript -e '${script}'`, { timeout: 5000 });

        return {
          success: true,
          result: {
            message: `已按下 ${modifiers.length > 0 ? modifiers.join("+") + "+" : ""}${key}`,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Click a menu item
 */
function createClickMenuTool(): AgentTool {
  return {
    name: "click_menu",
    description: `点击应用菜单项。
示例: app="Finder", menu="File", item="New Finder Window"`,
    inputSchema: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "应用名称",
        },
        menu: {
          type: "string",
          description: "菜单名称，如 File, Edit, View",
        },
        item: {
          type: "string",
          description: "菜单项名称",
        },
      },
      required: ["app", "menu", "item"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const app = input["app"] as string;
      const menu = input["menu"] as string;
      const item = input["item"] as string;

      try {
        const script = `
          tell application "${app}" to activate
          delay 0.3
          tell application "System Events"
            tell process "${app}"
              click menu item "${item}" of menu "${menu}" of menu bar 1
            end tell
          end tell
        `;

        execSync(`osascript -e '${script}'`, { timeout: 10000 });

        return {
          success: true,
          result: {
            message: `已点击 ${app} -> ${menu} -> ${item}`,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}
