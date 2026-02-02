/**
 * Anthropic Claude provider
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../../config/schema.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("anthropic");

let clientInstance: Anthropic | null = null;

/**
 * Get or create Anthropic client
 */
export function getAnthropicClient(config: Config): Anthropic {
  if (!clientInstance) {
    const anthropicConfig = config.models.anthropic;
    if (!anthropicConfig?.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    // Check if using a proxy that requires Bearer auth
    const useBearer = anthropicConfig.baseUrl?.includes("sssaicode") ||
                      anthropicConfig.baseUrl?.includes("proxy") ||
                      anthropicConfig.authType === "bearer";

    if (useBearer) {
      // For proxy services that use Bearer token auth
      clientInstance = new Anthropic({
        apiKey: anthropicConfig.apiKey,
        baseURL: anthropicConfig.baseUrl,
        defaultHeaders: {
          "Authorization": `Bearer ${anthropicConfig.apiKey}`,
        },
      });
    } else {
      // Standard Anthropic API
      clientInstance = new Anthropic({
        apiKey: anthropicConfig.apiKey,
        baseURL: anthropicConfig.baseUrl,
      });
    }

    logger.debug("Anthropic client created", { baseUrl: anthropicConfig.baseUrl });
  }
  return clientInstance;
}

/**
 * Reset client instance (for testing)
 */
export function resetAnthropicClient(): void {
  clientInstance = null;
}

/**
 * Tool definition for Claude
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool call from Claude
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result to send back
 */
export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Content block types for messages
 */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

/**
 * Message for conversation
 */
export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

/**
 * Response from Claude
 */
export interface ClaudeResponse {
  content: string;
  toolCalls: ToolCall[];
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Call Claude API with retry logic
 */
export async function callClaude(params: {
  client: Anthropic;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: Message[];
  tools?: ToolDefinition[];
}): Promise<ClaudeResponse> {
  const { client, model, maxTokens, systemPrompt, messages, tools } = params;

  logger.debug("Calling Claude", { model, messageCount: messages.length });

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: tools?.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema,
        })),
      });

      const textContent: string[] = [];
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          textContent.push(block.text);
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      logger.debug("Claude response received", {
        stopReason: response.stop_reason,
        toolCalls: toolCalls.length,
      });

      return {
        content: textContent.join("\n"),
        toolCalls,
        stopReason: response.stop_reason ?? "end_turn",
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.message?.includes("invalid json") ||
                          error.message?.includes("network") ||
                          error.status === 502 ||
                          error.status === 503 ||
                          error.status === 529;

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s, 6s
        logger.warn(`Claude API error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, {
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Failed to call Claude API");
}

/**
 * Build tool result message content
 */
export function buildToolResultContent(results: ToolResult[]): ContentBlock[] {
  return results.map((r) => ({
    type: "tool_result" as const,
    tool_use_id: r.tool_use_id,
    content: r.content,
    is_error: r.is_error,
  }));
}

/**
 * Build tool use message content
 */
export function buildToolUseContent(toolCalls: ToolCall[]): ContentBlock[] {
  return toolCalls.map((tc) => ({
    type: "tool_use" as const,
    id: tc.id,
    name: tc.name,
    input: tc.input,
  }));
}

/**
 * Streaming callback type
 */
export type StreamCallback = (event: StreamEvent) => void;

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "tool_use_delta"; id: string; input: string }
  | { type: "content_block_stop" }
  | { type: "message_stop"; usage: { inputTokens: number; outputTokens: number } };

/**
 * Call Claude API with streaming
 * Uses raw stream with stream: true for better proxy compatibility
 */
export async function callClaudeStream(params: {
  client: Anthropic;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: Message[];
  tools?: ToolDefinition[];
  onStream: StreamCallback;
}): Promise<ClaudeResponse> {
  const { client, model, maxTokens, systemPrompt, messages, tools, onStream } = params;

  logger.debug("Calling Claude (streaming)", { model, messageCount: messages.length });

  // Use raw stream with stream: true for better compatibility with proxy services
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    tools: tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    })),
    stream: true,
  });

  const textContent: string[] = [];
  const toolCalls: ToolCall[] = [];
  let currentToolCall: { id: string; name: string; inputJson: string } | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason = "end_turn";

  for await (const event of response) {
    if (event.type === "message_start") {
      inputTokens = event.message.usage?.input_tokens ?? 0;
    } else if (event.type === "content_block_start") {
      if (event.content_block.type === "tool_use") {
        currentToolCall = {
          id: event.content_block.id,
          name: event.content_block.name,
          inputJson: "",
        };
        onStream({ type: "tool_use_start", id: event.content_block.id, name: event.content_block.name });
      }
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        textContent.push(event.delta.text);
        onStream({ type: "text_delta", text: event.delta.text });
      } else if (event.delta.type === "input_json_delta" && currentToolCall) {
        currentToolCall.inputJson += event.delta.partial_json;
        onStream({ type: "tool_use_delta", id: currentToolCall.id, input: event.delta.partial_json });
      }
    } else if (event.type === "content_block_stop") {
      if (currentToolCall) {
        try {
          const input = JSON.parse(currentToolCall.inputJson || "{}");
          toolCalls.push({
            id: currentToolCall.id,
            name: currentToolCall.name,
            input,
          });
        } catch {
          logger.warn("Failed to parse tool input JSON", { json: currentToolCall.inputJson });
        }
        currentToolCall = null;
      }
      onStream({ type: "content_block_stop" });
    } else if (event.type === "message_delta") {
      stopReason = event.delta.stop_reason ?? "end_turn";
      outputTokens = event.usage?.output_tokens ?? 0;
    } else if (event.type === "message_stop") {
      // Final event
    }
  }

  onStream({
    type: "message_stop",
    usage: {
      inputTokens,
      outputTokens,
    },
  });

  logger.debug("Claude streaming response complete", {
    stopReason,
    toolCalls: toolCalls.length,
  });

  return {
    content: textContent.join(""),
    toolCalls,
    stopReason,
    usage: {
      inputTokens,
      outputTokens,
    },
  };
}
