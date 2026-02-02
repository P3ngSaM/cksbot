/**
 * Feishu document tools
 */

import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { getFeishuClient } from "../../feishu/client.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("docs-tools");

/**
 * Create document tools
 */
export function createDocsTools(): AgentTool[] {
  return [
    createGetDocTool(),
    createCreateDocTool(),
  ];
}

/**
 * Get document content tool
 */
function createGetDocTool(): AgentTool {
  return {
    name: "feishu_get_doc",
    description: "获取飞书文档内容。可以读取文档的标题和正文。",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "文档ID",
        },
      },
      required: ["document_id"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const documentId = input["document_id"] as string;

      try {
        const client = getFeishuClient(feishuConfig);

        // Get document metadata
        const response = await client.docx.document.get({
          path: { document_id: documentId },
        });

        if (response.code === 0 && response.data?.document) {
          const doc = response.data.document;

          // Get document content
          const contentResponse = await client.docx.document.rawContent({
            path: { document_id: documentId },
          });

          return {
            success: true,
            result: {
              documentId: doc.document_id,
              title: doc.title,
              revisionId: doc.revision_id,
              content: contentResponse.data?.content ?? "",
            },
          };
        }

        return {
          success: false,
          error: response.msg ?? "Failed to get document",
        };
      } catch (error) {
        logger.error("Failed to get document", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}

/**
 * Create document tool
 */
function createCreateDocTool(): AgentTool {
  return {
    name: "feishu_create_doc",
    description: "创建飞书文档。可以创建一个新的空白文档。",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "文档标题",
        },
        folder_token: {
          type: "string",
          description: "文件夹token，指定文档创建的位置",
        },
      },
      required: ["title"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const title = input["title"] as string;
      const folderToken = input["folder_token"] as string | undefined;

      try {
        const client = getFeishuClient(feishuConfig);

        const response = await client.docx.document.create({
          data: {
            title,
            folder_token: folderToken,
          },
        });

        if (response.code === 0 && response.data?.document) {
          return {
            success: true,
            result: {
              documentId: response.data.document.document_id,
              title: response.data.document.title,
              revisionId: response.data.document.revision_id,
              status: "created",
            },
          };
        }

        return {
          success: false,
          error: response.msg ?? "Failed to create document",
        };
      } catch (error) {
        logger.error("Failed to create document", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}
