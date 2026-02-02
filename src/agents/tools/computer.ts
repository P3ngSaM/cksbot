/**
 * Computer operation tools - 计算机操作工具
 * 允许 Agent 执行本地命令和文件操作
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import type { AgentTool, ToolExecutionResult } from "./common.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("computer-tools");

// 工作目录，默认为用户主目录
let currentWorkingDir = homedir();

/**
 * Create computer operation tools
 */
export function createComputerTools(): AgentTool[] {
  return [
    createShellTool(),
    createReadFileTool(),
    createWriteFileTool(),
    createListDirTool(),
    createCwdTool(),
    createChangeDirTool(),
    createMkdirTool(),
    createDeleteFileTool(),
  ];
}

/**
 * Execute shell command
 */
function createShellTool(): AgentTool {
  return {
    name: "shell",
    description: `在本地终端执行命令。可以运行任何 shell 命令，如 ls、cat、python、node 等。
当前工作目录: ${currentWorkingDir}
注意: 命令执行超时时间为30秒`,
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "要执行的 shell 命令",
        },
        timeout: {
          type: "number",
          description: "超时时间（毫秒），默认 30000",
        },
      },
      required: ["command"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const command = input["command"] as string;
      const timeout = (input["timeout"] as number) ?? 30000;

      // 安全检查：阻止危险命令
      const dangerousPatterns = [
        /rm\s+-rf\s+[\/~]/,     // rm -rf / 或 ~
        /mkfs/,                 // 格式化磁盘
        /dd\s+if=.*of=\/dev/,   // 写入磁盘设备
        /:\(\)\{:\|:&\};:/,     // fork bomb
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
          return {
            success: false,
            error: "拒绝执行危险命令",
          };
        }
      }

      try {
        logger.info("Executing shell command", { command, cwd: currentWorkingDir });

        const output = execSync(command, {
          cwd: currentWorkingDir,
          timeout,
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024, // 10MB
          env: { ...process.env, HOME: homedir() },
        });

        return {
          success: true,
          result: {
            output: output.trim(),
            cwd: currentWorkingDir,
          },
        };
      } catch (error: any) {
        logger.error("Shell command failed", { command, error: error.message });
        return {
          success: false,
          error: error.message,
          result: {
            stderr: error.stderr?.toString() ?? "",
            stdout: error.stdout?.toString() ?? "",
            exitCode: error.status,
          },
        };
      }
    },
  };
}

/**
 * Read file content
 */
function createReadFileTool(): AgentTool {
  return {
    name: "read_file",
    description: "读取文件内容。支持文本文件，大文件会被截断。",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "文件路径（绝对路径或相对于当前工作目录的相对路径）",
        },
        encoding: {
          type: "string",
          description: "编码格式，默认 utf-8",
        },
        maxBytes: {
          type: "number",
          description: "最大读取字节数，默认 100KB",
        },
      },
      required: ["path"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const path = input["path"] as string;
      const encoding = (input["encoding"] as BufferEncoding) ?? "utf-8";
      const maxBytes = (input["maxBytes"] as number) ?? 100 * 1024;

      const fullPath = resolve(currentWorkingDir, path);

      try {
        if (!existsSync(fullPath)) {
          return {
            success: false,
            error: `文件不存在: ${fullPath}`,
          };
        }

        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          return {
            success: false,
            error: `这是一个目录，请使用 list_dir 命令`,
          };
        }

        let content = readFileSync(fullPath, encoding);
        let truncated = false;

        if (Buffer.byteLength(content, encoding) > maxBytes) {
          content = content.slice(0, maxBytes);
          truncated = true;
        }

        return {
          success: true,
          result: {
            content,
            path: fullPath,
            size: stat.size,
            truncated,
          },
        };
      } catch (error: any) {
        logger.error("Failed to read file", { path: fullPath, error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Write file content
 */
function createWriteFileTool(): AgentTool {
  return {
    name: "write_file",
    description: "写入内容到文件。如果文件不存在会创建，如果存在会覆盖。",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "文件路径",
        },
        content: {
          type: "string",
          description: "要写入的内容",
        },
        append: {
          type: "boolean",
          description: "是否追加模式，默认 false（覆盖）",
        },
      },
      required: ["path", "content"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const path = input["path"] as string;
      const content = input["content"] as string;
      const append = (input["append"] as boolean) ?? false;

      const fullPath = resolve(currentWorkingDir, path);

      try {
        // 确保目录存在
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        if (append && existsSync(fullPath)) {
          const existing = readFileSync(fullPath, "utf-8");
          writeFileSync(fullPath, existing + content, "utf-8");
        } else {
          writeFileSync(fullPath, content, "utf-8");
        }

        return {
          success: true,
          result: {
            path: fullPath,
            bytesWritten: Buffer.byteLength(content, "utf-8"),
          },
        };
      } catch (error: any) {
        logger.error("Failed to write file", { path: fullPath, error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * List directory contents
 */
function createListDirTool(): AgentTool {
  return {
    name: "list_dir",
    description: "列出目录内容",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "目录路径，默认为当前工作目录",
        },
        showHidden: {
          type: "boolean",
          description: "是否显示隐藏文件，默认 false",
        },
      },
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const path = (input["path"] as string) ?? ".";
      const showHidden = (input["showHidden"] as boolean) ?? false;

      const fullPath = resolve(currentWorkingDir, path);

      try {
        if (!existsSync(fullPath)) {
          return {
            success: false,
            error: `目录不存在: ${fullPath}`,
          };
        }

        const items = readdirSync(fullPath);
        const entries = items
          .filter(item => showHidden || !item.startsWith("."))
          .map(item => {
            const itemPath = join(fullPath, item);
            try {
              const stat = statSync(itemPath);
              return {
                name: item,
                type: stat.isDirectory() ? "directory" : "file",
                size: stat.size,
                modified: stat.mtime.toISOString(),
              };
            } catch {
              return {
                name: item,
                type: "unknown",
              };
            }
          });

        return {
          success: true,
          result: {
            path: fullPath,
            entries,
            total: entries.length,
          },
        };
      } catch (error: any) {
        logger.error("Failed to list directory", { path: fullPath, error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Get current working directory
 */
function createCwdTool(): AgentTool {
  return {
    name: "cwd",
    description: "获取当前工作目录",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async (): Promise<ToolExecutionResult> => {
      return {
        success: true,
        result: {
          cwd: currentWorkingDir,
        },
      };
    },
  };
}

/**
 * Change working directory
 */
function createChangeDirTool(): AgentTool {
  return {
    name: "cd",
    description: "切换当前工作目录",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "目标目录路径",
        },
      },
      required: ["path"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const path = input["path"] as string;

      // 处理 ~ 符号
      const expandedPath = path.replace(/^~/, homedir());
      const fullPath = resolve(currentWorkingDir, expandedPath);

      try {
        if (!existsSync(fullPath)) {
          return {
            success: false,
            error: `目录不存在: ${fullPath}`,
          };
        }

        const stat = statSync(fullPath);
        if (!stat.isDirectory()) {
          return {
            success: false,
            error: `不是目录: ${fullPath}`,
          };
        }

        currentWorkingDir = fullPath;
        logger.info("Changed working directory", { cwd: currentWorkingDir });

        return {
          success: true,
          result: {
            cwd: currentWorkingDir,
          },
        };
      } catch (error: any) {
        logger.error("Failed to change directory", { path: fullPath, error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Create directory
 */
function createMkdirTool(): AgentTool {
  return {
    name: "mkdir",
    description: "创建目录",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "目录路径",
        },
      },
      required: ["path"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const path = input["path"] as string;
      const fullPath = resolve(currentWorkingDir, path);

      try {
        mkdirSync(fullPath, { recursive: true });
        return {
          success: true,
          result: {
            path: fullPath,
          },
        };
      } catch (error: any) {
        logger.error("Failed to create directory", { path: fullPath, error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}

/**
 * Delete file
 */
function createDeleteFileTool(): AgentTool {
  return {
    name: "delete_file",
    description: "删除文件（不能删除目录，需要用 shell rm -r）",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "文件路径",
        },
      },
      required: ["path"],
    },
    execute: async (input): Promise<ToolExecutionResult> => {
      const path = input["path"] as string;
      const fullPath = resolve(currentWorkingDir, path);

      try {
        if (!existsSync(fullPath)) {
          return {
            success: false,
            error: `文件不存在: ${fullPath}`,
          };
        }

        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          return {
            success: false,
            error: `不能删除目录，请使用 shell 命令: rm -r "${fullPath}"`,
          };
        }

        unlinkSync(fullPath);
        return {
          success: true,
          result: {
            deleted: fullPath,
          },
        };
      } catch (error: any) {
        logger.error("Failed to delete file", { path: fullPath, error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };
}
