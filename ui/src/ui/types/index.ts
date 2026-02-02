/**
 * Type definitions for FeishuPilot UI
 */

export interface GatewayStatus {
  version: string;
  uptime: number;
  channels: ChannelStatus[];
  activeSessions: number;
}

export interface ChannelStatus {
  id: string;
  type: string;
  status: 'running' | 'error' | 'stopped';
  connectedAt?: string;
  error?: string;
}

export interface UserProfile {
  userId: string;
  name?: string;
  preferences?: Record<string, unknown>;
  notes?: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface ScheduledTask {
  id: string;
  userId: string;
  chatId: string;
  cronExpression?: string;
  executeAt?: string;
  repeat?: 'daily' | 'weekly' | 'monthly' | 'once';
  action: {
    type: 'send_message' | 'run_agent' | 'send_wechat' | 'send_feishu';
    content: string;
    contact?: string;
    targetApp?: 'wechat' | 'feishu';
  };
  enabled: boolean;
  lastRun?: string;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
  config?: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}
