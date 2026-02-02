/**
 * Configuration schema using Zod
 */

import { z } from "zod";

export const AgentConfigSchema = z.object({
  model: z.string().default("claude-sonnet-4-5-20250929"),
  maxTokens: z.number().int().positive().default(8192),
  systemPrompt: z.string().optional(),
});

export const AnthropicModelConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(["apikey", "bearer"]).optional(), // bearer for proxy services
});

export const OpenAIModelConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url().optional(),
  model: z.string().optional(),
});

// Gemini 模型配置
export const GeminiModelConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string().optional(),  // 默认 gemini-2.0-flash
  liveModel: z.string().optional(),  // Live API 模型，默认 gemini-2.0-flash-live-001
  voiceName: z.string().optional(),  // Puck, Charon, Kore, Fenrir, Aoede
});

// Qwen (通义千问) 模型配置
export const QwenModelConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string().optional(),  // 默认 qwen-max
  realtimeModel: z.string().optional(),  // 实时语音模型，默认 qwen-omni-turbo-realtime
  voice: z.string().optional(),  // 音色：Cherry, Serena, Ethan 等
  speechRate: z.number().min(0.5).max(2.0).default(1.2),  // 语速：0.5-2.0，默认 1.2 (稍快)
});

// 视觉模型配置
export const VisionModelConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "local"]).default("anthropic"),
  model: z.string().optional(), // 默认使用主模型
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

// 语音模型配置
export const SpeechConfigSchema = z.object({
  // TTS 配置
  tts: z.object({
    provider: z.enum(["minimax", "openai", "edge", "system"]).default("minimax"),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    voice: z.string().default("Wise_Woman"), // MiniMax default voice
    model: z.string().default("speech-02-hd"), // speech-02-hd, speech-02-turbo, speech-2.8-hd
    speed: z.number().default(1.0),
    emotion: z.string().optional(), // happy, sad, angry, fearful, disgusted, surprised, calm
  }).default({}),
  // STT 配置 (Speech-to-Text)
  stt: z.object({
    provider: z.enum(["openai", "whisper", "system"]).default("system"),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().default("whisper-1"),
    language: z.string().default("zh"),
  }).default({}),
  // Realtime 实时语音配置 (MiniMax WebSocket TTS)
  realtime: z.object({
    apiKey: z.string().optional(), // MiniMax API key for realtime
    baseUrl: z.string().optional().default("wss://api.minimaxi.com/ws/v1/t2a_v2"),
    voice: z.string().default("female-shaonv"),  // 少女音色
    model: z.string().default("speech-02-hd"),
  }).default({}),
});

export const ModelsConfigSchema = z.object({
  anthropic: AnthropicModelConfigSchema.optional(),
  openai: OpenAIModelConfigSchema.optional(),
  gemini: GeminiModelConfigSchema.optional(),
  qwen: QwenModelConfigSchema.optional(),
  vision: VisionModelConfigSchema.optional(),
  speech: SpeechConfigSchema.optional(),
});

export const FeishuChannelConfigSchema = z.object({
  appId: z.string(),
  appSecret: z.string(),
  encryptKey: z.string().optional(),
  verificationToken: z.string().optional(),
  mode: z.enum(["websocket", "webhook"]).default("websocket"),
  webhookUrl: z.string().url().optional(),
  dmPolicy: z.enum(["pairing", "broadcast"]).default("pairing"),
  requireMention: z.boolean().default(true),
});

export const ChannelsConfigSchema = z.object({
  feishu: FeishuChannelConfigSchema.optional(),
});

export const GatewayConfigSchema = z.object({
  port: z.number().int().positive().default(18789),
  host: z.string().default("127.0.0.1"),
});

export const ConfigSchema = z.object({
  agent: AgentConfigSchema.default({}),
  models: ModelsConfigSchema.default({}),
  channels: ChannelsConfigSchema.default({}),
  gateway: GatewayConfigSchema.default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>;
export type VisionModelConfig = z.infer<typeof VisionModelConfigSchema>;
export type SpeechConfig = z.infer<typeof SpeechConfigSchema>;
export type FeishuChannelConfig = z.infer<typeof FeishuChannelConfigSchema>;
export type ChannelsConfig = z.infer<typeof ChannelsConfigSchema>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export function getDefaultConfig(): Config {
  return ConfigSchema.parse({});
}
