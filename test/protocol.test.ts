/**
 * RPC protocol tests
 */

import { describe, it, expect } from "vitest";
import {
  createRPCRequest,
  createRPCResponse,
  createRPCNotification,
  createRPCError,
  RPCErrorCodes,
  GatewayMethods,
} from "../src/gateway/protocol/types.js";

describe("RPC Protocol", () => {
  describe("createRPCRequest", () => {
    it("should create a request message", () => {
      const request = createRPCRequest("1", "test.method", { foo: "bar" });

      expect(request.id).toBe("1");
      expect(request.type).toBe("request");
      expect(request.method).toBe("test.method");
      expect(request.params).toEqual({ foo: "bar" });
    });

    it("should create a request without params", () => {
      const request = createRPCRequest("1", "test.method");

      expect(request.params).toBeUndefined();
    });
  });

  describe("createRPCResponse", () => {
    it("should create a success response", () => {
      const response = createRPCResponse("1", { result: "ok" });

      expect(response.id).toBe("1");
      expect(response.type).toBe("response");
      expect(response.result).toEqual({ result: "ok" });
      expect(response.error).toBeUndefined();
    });

    it("should create an error response", () => {
      const error = createRPCError(-1, "Test error");
      const response = createRPCResponse("1", undefined, error);

      expect(response.id).toBe("1");
      expect(response.type).toBe("response");
      expect(response.result).toBeUndefined();
      expect(response.error).toEqual({ code: -1, message: "Test error" });
    });
  });

  describe("createRPCNotification", () => {
    it("should create a notification message", () => {
      const notification = createRPCNotification("event.message", {
        messageId: "123",
      });

      expect(notification.type).toBe("notification");
      expect(notification.method).toBe("event.message");
      expect(notification.params).toEqual({ messageId: "123" });
    });
  });

  describe("createRPCError", () => {
    it("should create an error object", () => {
      const error = createRPCError(-32600, "Invalid Request", { detail: "foo" });

      expect(error.code).toBe(-32600);
      expect(error.message).toBe("Invalid Request");
      expect(error.data).toEqual({ detail: "foo" });
    });
  });

  describe("RPCErrorCodes", () => {
    it("should have standard error codes", () => {
      expect(RPCErrorCodes.PARSE_ERROR).toBe(-32700);
      expect(RPCErrorCodes.INVALID_REQUEST).toBe(-32600);
      expect(RPCErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
      expect(RPCErrorCodes.INVALID_PARAMS).toBe(-32602);
      expect(RPCErrorCodes.INTERNAL_ERROR).toBe(-32603);
    });

    it("should have custom error codes", () => {
      expect(RPCErrorCodes.CHANNEL_NOT_FOUND).toBe(-1001);
      expect(RPCErrorCodes.SESSION_NOT_FOUND).toBe(-1002);
      expect(RPCErrorCodes.TOOL_EXECUTION_ERROR).toBe(-1003);
    });
  });

  describe("GatewayMethods", () => {
    it("should have all gateway methods", () => {
      expect(GatewayMethods.PING).toBe("ping");
      expect(GatewayMethods.STATUS).toBe("status");
      expect(GatewayMethods.CHANNEL_START).toBe("channel.start");
      expect(GatewayMethods.AGENT_RUN).toBe("agent.run");
      expect(GatewayMethods.EVENT_MESSAGE).toBe("event.message");
    });
  });
});
