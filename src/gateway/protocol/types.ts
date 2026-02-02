/**
 * Gateway RPC protocol types
 */

/**
 * RPC message types
 */
export type RPCMessageType =
  | "request"
  | "response"
  | "notification"
  | "error";

/**
 * Base RPC message
 */
export interface RPCMessage {
  id: string;
  type: RPCMessageType;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: RPCError;
}

/**
 * RPC error
 */
export interface RPCError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * RPC request message
 */
export interface RPCRequest extends RPCMessage {
  type: "request";
  method: string;
  params?: unknown;
}

/**
 * RPC response message
 */
export interface RPCResponse extends RPCMessage {
  type: "response";
  result?: unknown;
  error?: RPCError;
}

/**
 * RPC notification (no response expected)
 */
export interface RPCNotification extends RPCMessage {
  type: "notification";
  method: string;
  params?: unknown;
}

/**
 * Common RPC error codes
 */
export const RPCErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom error codes
  CHANNEL_NOT_FOUND: -1001,
  SESSION_NOT_FOUND: -1002,
  TOOL_EXECUTION_ERROR: -1003,
} as const;

/**
 * Create an RPC error
 */
export function createRPCError(code: number, message: string, data?: unknown): RPCError {
  return { code, message, data };
}

/**
 * Create an RPC request
 */
export function createRPCRequest(id: string, method: string, params?: unknown): RPCRequest {
  return { id, type: "request", method, params };
}

/**
 * Create an RPC response
 */
export function createRPCResponse(id: string, result?: unknown, error?: RPCError): RPCResponse {
  return { id, type: "response", result, error };
}

/**
 * Create an RPC notification
 */
export function createRPCNotification(method: string, params?: unknown): RPCNotification {
  return { id: "", type: "notification", method, params };
}

/**
 * Gateway methods
 */
export const GatewayMethods = {
  // Status
  PING: "ping",
  STATUS: "status",

  // Channel management
  CHANNEL_START: "channel.start",
  CHANNEL_STOP: "channel.stop",
  CHANNEL_LIST: "channel.list",

  // Session management
  SESSION_GET: "session.get",
  SESSION_LIST: "session.list",
  SESSION_CLEAR: "session.clear",

  // Agent execution
  AGENT_RUN: "agent.run",
  AGENT_CANCEL: "agent.cancel",

  // Memory
  MEMORY_USERS: "memory.users",
  MEMORY_USER_GET: "memory.user.get",
  MEMORY_USER_DELETE: "memory.user.delete",

  // Schedules
  SCHEDULES_LIST: "schedules.list",
  SCHEDULES_CREATE: "schedules.create",
  SCHEDULES_DELETE: "schedules.delete",
  SCHEDULES_TOGGLE: "schedules.toggle",

  // Skills
  SKILLS_LIST: "skills.list",
  SKILLS_TOGGLE: "skills.toggle",

  // Events (notifications)
  EVENT_MESSAGE: "event.message",
  EVENT_AGENT_RESPONSE: "event.agentResponse",
} as const;

/**
 * Channel status
 */
export interface ChannelStatus {
  id: string;
  type: string;
  status: "running" | "stopped" | "error";
  connectedAt?: string;
  error?: string;
}

/**
 * Gateway status
 */
export interface GatewayStatus {
  version: string;
  uptime: number;
  channels: ChannelStatus[];
  activeSessions: number;
}
