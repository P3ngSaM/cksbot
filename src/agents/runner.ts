/**
 * Agent runner - core execution logic
 */

import type { Config } from "../config/schema.js";
import {
  getAnthropicClient,
  callClaude,
  callClaudeStream,
  buildToolResultContent,
  buildToolUseContent,
  type Message,
  type ToolResult,
  type StreamCallback,
  type StreamEvent,
} from "./providers/anthropic.js";
import { addMessage, getMessages } from "./context.js";
import { executeTool, toToolDefinitions, type AgentTool, type ToolContext } from "./tools/common.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("runner");

/**
 * Maximum number of tool call iterations
 */
const MAX_ITERATIONS = 50;

/**
 * Agent response
 */
export interface AgentResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
    result: unknown;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Run agent parameters
 */
export interface RunAgentParams {
  sessionId: string;
  tools: AgentTool[];
  systemPrompt: string;
  userMessage: string;
  config: Config;
  userId?: string;
  chatId?: string;
  stream?: boolean;
  onStream?: StreamCallback;
}

/**
 * Agent stream event (for external consumers)
 */
export type AgentStreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string; result: unknown }
  | { type: "done"; content: string };

export type AgentStreamCallback = (event: AgentStreamEvent) => void;

/**
 * Run the agent with a user message
 */
export async function runAgent(params: RunAgentParams): Promise<AgentResponse> {
  const { sessionId, tools, systemPrompt, userMessage, config, userId, chatId, stream, onStream } = params;

  logger.info("Running agent", { sessionId, messageLength: userMessage.length, stream: !!stream, toolCount: tools.length });

  // Get Anthropic client
  const client = getAnthropicClient(config);

  // Get conversation history
  const history = getMessages(sessionId);

  // Add user message to history
  const userMsg: Message = { role: "user", content: userMessage };
  addMessage(sessionId, userMsg);

  // Build messages for API call
  const messages: Message[] = [...history, userMsg];

  // Prepare tool definitions
  const toolDefinitions = toToolDefinitions(tools);
  logger.debug("Tool definitions prepared", { count: toolDefinitions.length, tools: toolDefinitions.map(t => t.name) });

  // Tool context
  const toolContext: ToolContext = {
    sessionId,
    userId,
    chatId,
    config,
  };

  // Track all tool calls
  const allToolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    result: unknown;
  }> = [];

  // Token usage
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Iteration loop for tool calls
  let iteration = 0;
  let finalContent = "";

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    logger.debug("Agent iteration", { iteration });

    // Call Claude (with or without streaming)
    let response;
    if (stream && onStream) {
      response = await callClaudeStream({
        client,
        model: config.agent.model,
        maxTokens: config.agent.maxTokens,
        systemPrompt,
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        onStream,
      });
    } else {
      response = await callClaude({
        client,
        model: config.agent.model,
        maxTokens: config.agent.maxTokens,
        systemPrompt,
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
      });
    }

    totalInputTokens += response.usage.inputTokens;
    totalOutputTokens += response.usage.outputTokens;

    // Log tool calls from response
    logger.info("Claude response", {
      contentLength: response.content.length,
      toolCallCount: response.toolCalls.length,
      toolNames: response.toolCalls.map(tc => tc.name),
      stopReason: response.stopReason,
    });

    // Check if we're done (no tool calls)
    if (response.toolCalls.length === 0) {
      finalContent = response.content;
      break;
    }

    // Process tool calls
    const toolResults: ToolResult[] = [];

    for (const toolCall of response.toolCalls) {
      logger.info("Executing tool", { name: toolCall.name, input: toolCall.input });

      const result = await executeTool(toolCall.name, toolCall.input, toolContext);

      logger.info("Tool result", { name: toolCall.name, success: result.success, result: result.result });

      allToolCalls.push({
        name: toolCall.name,
        input: toolCall.input,
        result: result.success ? result.result : result.error,
      });

      toolResults.push({
        tool_use_id: toolCall.id,
        content: JSON.stringify(result.success ? result.result : { error: result.error }),
        is_error: !result.success,
      });
    }

    // Add assistant message with tool use
    const assistantContent = [
      ...(response.content ? [{ type: "text" as const, text: response.content }] : []),
      ...buildToolUseContent(response.toolCalls),
    ];

    messages.push({
      role: "assistant",
      content: assistantContent,
    });

    // Add tool results as user message
    messages.push({
      role: "user",
      content: buildToolResultContent(toolResults),
    });

    // If Claude wants to stop after tool use, continue to get final response
    if (response.stopReason === "end_turn") {
      // Get final response after tool execution (always use streaming if enabled)
      let finalResponse;
      if (stream && onStream) {
        finalResponse = await callClaudeStream({
          client,
          model: config.agent.model,
          maxTokens: config.agent.maxTokens,
          systemPrompt,
          messages,
          tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
          onStream,
        });
      } else {
        finalResponse = await callClaude({
          client,
          model: config.agent.model,
          maxTokens: config.agent.maxTokens,
          systemPrompt,
          messages,
          tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        });
      }

      totalInputTokens += finalResponse.usage.inputTokens;
      totalOutputTokens += finalResponse.usage.outputTokens;

      if (finalResponse.toolCalls.length === 0) {
        finalContent = finalResponse.content;
        break;
      }
    }
  }

  if (iteration >= MAX_ITERATIONS) {
    logger.warn("Agent reached max iterations", { sessionId });
    finalContent = finalContent || "抱歉，任务执行次数超过限制，请尝试简化您的请求。";
  }

  // Add final assistant message to history
  addMessage(sessionId, { role: "assistant", content: finalContent });

  logger.info("Agent completed", {
    sessionId,
    toolCalls: allToolCalls.length,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  });

  return {
    content: finalContent,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  };
}
