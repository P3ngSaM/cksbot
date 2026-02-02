/**
 * Configuration tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ConfigSchema,
  getDefaultConfig,
  substituteEnvVars,
  getConfigValue,
  setConfigValue,
} from "../src/config/index.js";

describe("ConfigSchema", () => {
  it("should parse a valid config", () => {
    const config = {
      agent: {
        model: "claude-sonnet-4-20250514",
        maxTokens: 4096,
      },
      models: {
        anthropic: {
          apiKey: "test-key",
        },
      },
      channels: {
        feishu: {
          appId: "cli_test",
          appSecret: "secret",
          mode: "websocket",
        },
      },
      gateway: {
        port: 8080,
        host: "0.0.0.0",
      },
    };

    const result = ConfigSchema.parse(config);
    expect(result.agent.model).toBe("claude-sonnet-4-20250514");
    expect(result.agent.maxTokens).toBe(4096);
    expect(result.gateway.port).toBe(8080);
  });

  it("should use defaults for missing fields", () => {
    const config = ConfigSchema.parse({});
    expect(config.agent.model).toBe("claude-sonnet-4-20250514");
    expect(config.agent.maxTokens).toBe(8192);
    expect(config.gateway.port).toBe(18789);
  });

  it("should reject invalid config", () => {
    expect(() => {
      ConfigSchema.parse({
        gateway: {
          port: -1,
        },
      });
    }).toThrow();
  });
});

describe("getDefaultConfig", () => {
  it("should return a valid default config", () => {
    const config = getDefaultConfig();
    expect(config.agent.model).toBe("claude-sonnet-4-20250514");
    expect(config.gateway.port).toBe(18789);
  });
});

describe("substituteEnvVars", () => {
  beforeEach(() => {
    process.env["TEST_VAR"] = "test-value";
    process.env["ANOTHER_VAR"] = "another";
  });

  afterEach(() => {
    delete process.env["TEST_VAR"];
    delete process.env["ANOTHER_VAR"];
  });

  it("should substitute environment variables", () => {
    const result = substituteEnvVars("${TEST_VAR}");
    expect(result).toBe("test-value");
  });

  it("should substitute multiple variables", () => {
    const result = substituteEnvVars("${TEST_VAR}-${ANOTHER_VAR}");
    expect(result).toBe("test-value-another");
  });

  it("should handle missing variables", () => {
    const result = substituteEnvVars("${MISSING_VAR}");
    expect(result).toBe("");
  });

  it("should leave non-variable strings unchanged", () => {
    const result = substituteEnvVars("plain text");
    expect(result).toBe("plain text");
  });
});

describe("getConfigValue", () => {
  const config = getDefaultConfig();

  it("should get top-level values", () => {
    const value = getConfigValue(config, "gateway");
    expect(value).toEqual({ port: 18789, host: "127.0.0.1" });
  });

  it("should get nested values", () => {
    const value = getConfigValue(config, "gateway.port");
    expect(value).toBe(18789);
  });

  it("should return undefined for missing keys", () => {
    const value = getConfigValue(config, "missing.key");
    expect(value).toBeUndefined();
  });
});

describe("setConfigValue", () => {
  it("should set top-level values", () => {
    const config = getDefaultConfig();
    const newConfig = setConfigValue(config, "gateway", { port: 9000, host: "localhost" });
    expect(newConfig.gateway.port).toBe(9000);
    expect(newConfig.gateway.host).toBe("localhost");
  });

  it("should set nested values", () => {
    const config = getDefaultConfig();
    const newConfig = setConfigValue(config, "agent.maxTokens", 2048);
    expect(newConfig.agent.maxTokens).toBe(2048);
  });

  it("should not mutate the original config", () => {
    const config = getDefaultConfig();
    setConfigValue(config, "agent.maxTokens", 2048);
    expect(config.agent.maxTokens).toBe(8192);
  });
});
