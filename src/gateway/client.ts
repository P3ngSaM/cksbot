/**
 * Gateway client for connecting to the RPC server
 */

import WebSocket from "ws";
import type { GatewayConfig } from "../config/schema.js";
import {
  type RPCRequest,
  type RPCResponse,
  type GatewayStatus,
  GatewayMethods,
  createRPCRequest,
} from "./protocol/types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("gateway-client");

/**
 * Gateway client
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, {
    resolve: (response: RPCResponse) => void;
    reject: (error: Error) => void;
  }>();
  private requestId = 0;
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  /**
   * Connect to the gateway
   */
  async connect(): Promise<void> {
    const url = `ws://${this.config.host}:${this.config.port}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        logger.info("Connected to gateway");
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const response = JSON.parse(data.toString()) as RPCResponse;
          const pending = this.pending.get(response.id);
          if (pending) {
            this.pending.delete(response.id);
            pending.resolve(response);
          }
        } catch (error) {
          logger.error("Failed to parse response", error);
        }
      });

      this.ws.on("error", (error) => {
        logger.error("WebSocket error", error);
        reject(error);
      });

      this.ws.on("close", () => {
        logger.info("Disconnected from gateway");
        this.ws = null;
      });
    });
  }

  /**
   * Disconnect from the gateway
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send an RPC request
   */
  async request(method: string, params?: unknown): Promise<RPCResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to gateway");
    }

    const id = `${++this.requestId}`;
    const request = createRPCRequest(id, method, params);

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Request timeout"));
      }, 30000);

      this.ws!.send(JSON.stringify(request), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  /**
   * Ping the gateway
   */
  async ping(): Promise<boolean> {
    const response = await this.request(GatewayMethods.PING);
    return response.result !== undefined;
  }

  /**
   * Get gateway status
   */
  async getStatus(): Promise<GatewayStatus> {
    const response = await this.request(GatewayMethods.STATUS);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result as GatewayStatus;
  }

  /**
   * Run agent with a message
   */
  async runAgent(params: {
    sessionId?: string;
    message: string;
    userId?: string;
    chatId?: string;
  }): Promise<{
    content: string;
    toolCalls?: Array<{
      name: string;
      input: Record<string, unknown>;
      result: unknown;
    }>;
  }> {
    const response = await this.request(GatewayMethods.AGENT_RUN, params);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result as {
      content: string;
      toolCalls?: Array<{
        name: string;
        input: Record<string, unknown>;
        result: unknown;
      }>;
    };
  }

  /**
   * List active sessions
   */
  async listSessions(): Promise<string[]> {
    const response = await this.request(GatewayMethods.SESSION_LIST);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return (response.result as { sessions: string[] }).sessions;
  }

  /**
   * Clear a session
   */
  async clearSession(sessionId: string): Promise<void> {
    const response = await this.request(GatewayMethods.SESSION_CLEAR, { sessionId });
    if (response.error) {
      throw new Error(response.error.message);
    }
  }
}

/**
 * Check if gateway is running
 */
export async function checkGatewayStatus(config: GatewayConfig): Promise<GatewayStatus | null> {
  const client = new GatewayClient(config);

  try {
    await client.connect();
    const status = await client.getStatus();
    client.disconnect();
    return status;
  } catch (error) {
    logger.debug("Gateway not reachable", error);
    return null;
  }
}
