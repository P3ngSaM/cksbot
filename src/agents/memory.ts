/**
 * Persistent memory system - 持久化记忆系统
 * 保存用户对话历史、用户档案、定时任务、助手身份
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Message } from "./providers/anthropic.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("memory");

// 数据目录
const DATA_DIR = join(homedir(), ".cksbot", "data");
const MEMORY_FILE = join(DATA_DIR, "memory.json");
const SCHEDULES_FILE = join(DATA_DIR, "schedules.json");
const IDENTITY_FILE = join(DATA_DIR, "identity.json");

/**
 * 助手身份
 */
export interface AssistantIdentity {
  name: string;
  avatar: string;
  personality?: string;  // 可选的性格描述
  updatedAt: string;
}

/**
 * 用户身份（全局）
 */
export interface GlobalUserIdentity {
  name: string;
  avatar?: string;
  updatedAt: string;
}

/**
 * 身份存储
 */
interface IdentityStore {
  assistant: AssistantIdentity;
  user: GlobalUserIdentity | null;
  version: number;
}

/**
 * 用户档案
 */
export interface UserProfile {
  userId: string;
  name?: string;
  preferences?: Record<string, unknown>;
  notes?: string[];  // Agent 记录的用户相关信息
  firstSeen: string;
  lastSeen: string;
}

/**
 * 对话记忆
 */
export interface ConversationMemory {
  sessionId: string;
  userId?: string;
  messages: Message[];
  summary?: string;  // 对话摘要
  createdAt: string;
  updatedAt: string;
}

/**
 * 定时任务
 */
export interface ScheduledTask {
  id: string;
  userId: string;
  chatId: string;
  cronExpression?: string;  // cron 表达式，如 "0 9 * * *" 每天9点
  executeAt?: string;       // 一次性任务的执行时间
  repeat?: "daily" | "weekly" | "monthly" | "once";
  action: {
    type: "send_message" | "run_agent" | "send_wechat" | "send_feishu";
    content: string;       // 消息内容或 agent 指令
    contact?: string;      // 联系人名称（用于微信/飞书）
    targetApp?: "wechat" | "feishu";  // 目标应用（用于 send_message 类型）
  };
  enabled: boolean;
  lastRun?: string;
  createdAt: string;
}

/**
 * 记忆存储
 */
interface MemoryStore {
  users: Record<string, UserProfile>;
  conversations: Record<string, ConversationMemory>;
  version: number;
}

/**
 * 定时任务存储
 */
interface ScheduleStore {
  tasks: ScheduledTask[];
  version: number;
}

// 内存中的缓存
let memoryCache: MemoryStore | null = null;
let scheduleCache: ScheduleStore | null = null;
let identityCache: IdentityStore | null = null;

// 默认助手身份
const DEFAULT_ASSISTANT: AssistantIdentity = {
  name: "AI 助手",
  avatar: "A",
  updatedAt: new Date().toISOString(),
};

/**
 * 确保数据目录存在
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    logger.info("Created data directory", { path: DATA_DIR });
  }
}

/**
 * 加载记忆数据
 */
function loadMemory(): MemoryStore {
  if (memoryCache) return memoryCache;

  ensureDataDir();

  if (existsSync(MEMORY_FILE)) {
    try {
      const data = readFileSync(MEMORY_FILE, "utf-8");
      memoryCache = JSON.parse(data) as MemoryStore;
      logger.info("Loaded memory", {
        users: Object.keys(memoryCache.users).length,
        conversations: Object.keys(memoryCache.conversations).length
      });
    } catch (error) {
      logger.error("Failed to load memory, starting fresh", error);
      memoryCache = { users: {}, conversations: {}, version: 1 };
    }
  } else {
    memoryCache = { users: {}, conversations: {}, version: 1 };
  }

  return memoryCache;
}

/**
 * 保存记忆数据
 */
function saveMemory(): void {
  if (!memoryCache) return;

  ensureDataDir();
  writeFileSync(MEMORY_FILE, JSON.stringify(memoryCache, null, 2), "utf-8");
  logger.debug("Saved memory");
}

/**
 * 加载定时任务
 */
function loadSchedules(): ScheduleStore {
  if (scheduleCache) return scheduleCache;

  ensureDataDir();

  if (existsSync(SCHEDULES_FILE)) {
    try {
      const data = readFileSync(SCHEDULES_FILE, "utf-8");
      scheduleCache = JSON.parse(data) as ScheduleStore;
      logger.info("Loaded schedules", { count: scheduleCache.tasks.length });
    } catch (error) {
      logger.error("Failed to load schedules, starting fresh", error);
      scheduleCache = { tasks: [], version: 1 };
    }
  } else {
    scheduleCache = { tasks: [], version: 1 };
  }

  return scheduleCache;
}

/**
 * 保存定时任务
 */
function saveSchedules(): void {
  if (!scheduleCache) return;

  ensureDataDir();
  writeFileSync(SCHEDULES_FILE, JSON.stringify(scheduleCache, null, 2), "utf-8");
  logger.debug("Saved schedules");
}

// ============ 用户档案 API ============

/**
 * 获取或创建用户档案
 */
export function getUserProfile(userId: string): UserProfile {
  const memory = loadMemory();

  if (!memory.users[userId]) {
    memory.users[userId] = {
      userId,
      notes: [],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    saveMemory();
    logger.debug("Created new user profile", { userId });
  } else {
    memory.users[userId].lastSeen = new Date().toISOString();
    saveMemory();
  }

  return memory.users[userId];
}

/**
 * 更新用户档案
 */
export function updateUserProfile(userId: string, updates: Partial<UserProfile>): void {
  const memory = loadMemory();
  const profile = getUserProfile(userId);

  Object.assign(profile, updates, { lastSeen: new Date().toISOString() });
  memory.users[userId] = profile;
  saveMemory();

  logger.debug("Updated user profile", { userId });
}

/**
 * 为用户添加备注
 */
export function addUserNote(userId: string, note: string): void {
  const memory = loadMemory();
  const profile = getUserProfile(userId);

  if (!profile.notes) profile.notes = [];
  profile.notes.push(`[${new Date().toISOString()}] ${note}`);

  // 保留最近 100 条备注
  if (profile.notes.length > 100) {
    profile.notes = profile.notes.slice(-100);
  }

  saveMemory();
  logger.debug("Added user note", { userId, note: note.substring(0, 50) });
}

/**
 * 获取所有用户
 */
export function getAllUsers(): UserProfile[] {
  const memory = loadMemory();
  return Object.values(memory.users);
}

// ============ 对话记忆 API ============

/**
 * 获取对话记忆
 */
export function getConversationMemory(sessionId: string): ConversationMemory | null {
  const memory = loadMemory();
  return memory.conversations[sessionId] || null;
}

/**
 * 保存对话记忆
 */
export function saveConversationMemory(
  sessionId: string,
  messages: Message[],
  userId?: string,
  summary?: string
): void {
  const memory = loadMemory();
  const now = new Date().toISOString();

  const existing = memory.conversations[sessionId];

  memory.conversations[sessionId] = {
    sessionId,
    userId,
    messages: messages.slice(-50), // 保留最近 50 条消息
    summary,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  saveMemory();
  logger.debug("Saved conversation memory", { sessionId, messageCount: messages.length });
}

/**
 * 获取用户的所有对话
 */
export function getUserConversations(userId: string): ConversationMemory[] {
  const memory = loadMemory();
  return Object.values(memory.conversations).filter(c => c.userId === userId);
}

/**
 * 清理旧对话（超过 7 天）
 */
export function cleanOldConversations(maxAgeDays: number = 7): number {
  const memory = loadMemory();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const [sessionId, conv] of Object.entries(memory.conversations)) {
    if (new Date(conv.updatedAt).getTime() < cutoff) {
      delete memory.conversations[sessionId];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    saveMemory();
    logger.info("Cleaned old conversations", { count: cleaned });
  }

  return cleaned;
}

// ============ 定时任务 API ============

/**
 * 创建定时任务
 */
export function createScheduledTask(task: Omit<ScheduledTask, "id" | "createdAt">): ScheduledTask {
  const schedules = loadSchedules();

  const newTask: ScheduledTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  schedules.tasks.push(newTask);
  saveSchedules();

  logger.info("Created scheduled task", { taskId: newTask.id, userId: task.userId });
  return newTask;
}

/**
 * 获取所有定时任务
 */
export function getAllScheduledTasks(): ScheduledTask[] {
  const schedules = loadSchedules();
  return schedules.tasks;
}

/**
 * 获取用户的定时任务
 */
export function getUserScheduledTasks(userId: string): ScheduledTask[] {
  const schedules = loadSchedules();
  return schedules.tasks.filter(t => t.userId === userId);
}

/**
 * 获取待执行的任务
 */
export function getDueScheduledTasks(): ScheduledTask[] {
  const schedules = loadSchedules();
  const now = new Date();

  return schedules.tasks.filter(task => {
    if (!task.enabled) return false;

    // 一次性任务
    if (task.executeAt) {
      const executeTime = new Date(task.executeAt);
      if (executeTime <= now && (!task.lastRun || new Date(task.lastRun) < executeTime)) {
        return true;
      }
    }

    // 重复任务（简单实现）
    if (task.repeat && task.repeat !== "once") {
      const lastRun = task.lastRun ? new Date(task.lastRun) : null;

      if (!lastRun) return true;

      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      switch (task.repeat) {
        case "daily":
          return hoursSinceLastRun >= 24;
        case "weekly":
          return hoursSinceLastRun >= 24 * 7;
        case "monthly":
          return hoursSinceLastRun >= 24 * 30;
      }
    }

    return false;
  });
}

/**
 * 标记任务已执行
 */
export function markTaskExecuted(taskId: string): void {
  const schedules = loadSchedules();
  const task = schedules.tasks.find(t => t.id === taskId);

  if (task) {
    task.lastRun = new Date().toISOString();

    // 一次性任务执行后禁用
    if (task.repeat === "once" || task.executeAt) {
      task.enabled = false;
    }

    saveSchedules();
    logger.info("Marked task as executed", { taskId });
  }
}

/**
 * 删除定时任务
 */
export function deleteScheduledTask(taskId: string): boolean {
  const schedules = loadSchedules();
  const index = schedules.tasks.findIndex(t => t.id === taskId);

  if (index >= 0) {
    schedules.tasks.splice(index, 1);
    saveSchedules();
    logger.info("Deleted scheduled task", { taskId });
    return true;
  }

  return false;
}

/**
 * 更新定时任务
 */
export function updateScheduledTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
  const schedules = loadSchedules();
  const task = schedules.tasks.find(t => t.id === taskId);

  if (task) {
    Object.assign(task, updates);
    saveSchedules();
    logger.info("Updated scheduled task", { taskId });
    return true;
  }

  return false;
}

// ============ 身份管理 API ============

/**
 * 加载身份数据
 */
function loadIdentity(): IdentityStore {
  if (identityCache) return identityCache;

  ensureDataDir();

  if (existsSync(IDENTITY_FILE)) {
    try {
      const data = readFileSync(IDENTITY_FILE, "utf-8");
      identityCache = JSON.parse(data) as IdentityStore;
      logger.info("Loaded identity", { assistantName: identityCache.assistant.name });
    } catch (error) {
      logger.error("Failed to load identity, using defaults", error);
      identityCache = { assistant: DEFAULT_ASSISTANT, user: null, version: 1 };
    }
  } else {
    identityCache = { assistant: DEFAULT_ASSISTANT, user: null, version: 1 };
  }

  return identityCache;
}

/**
 * 保存身份数据
 */
function saveIdentity(): void {
  if (!identityCache) return;

  ensureDataDir();
  writeFileSync(IDENTITY_FILE, JSON.stringify(identityCache, null, 2), "utf-8");
  logger.debug("Saved identity");
}

/**
 * 获取助手身份
 */
export function getAssistantIdentity(): AssistantIdentity {
  const identity = loadIdentity();
  return identity.assistant;
}

/**
 * 更新助手身份
 */
export function updateAssistantIdentity(updates: Partial<AssistantIdentity>): void {
  const identity = loadIdentity();
  Object.assign(identity.assistant, updates, { updatedAt: new Date().toISOString() });
  saveIdentity();
  logger.info("Updated assistant identity", { name: identity.assistant.name });
}

/**
 * 获取全局用户身份
 */
export function getGlobalUserIdentity(): GlobalUserIdentity | null {
  const identity = loadIdentity();
  return identity.user;
}

/**
 * 更新全局用户身份
 */
export function updateGlobalUserIdentity(updates: Partial<GlobalUserIdentity>): void {
  const identity = loadIdentity();
  if (!identity.user) {
    identity.user = { name: "", updatedAt: new Date().toISOString() };
  }
  Object.assign(identity.user, updates, { updatedAt: new Date().toISOString() });
  saveIdentity();
  logger.info("Updated global user identity", { name: identity.user.name });
}

/**
 * 获取完整身份信息（用于 RPC）
 */
export function getIdentity(): { assistant: AssistantIdentity; user: GlobalUserIdentity | null } {
  const identity = loadIdentity();
  return {
    assistant: identity.assistant,
    user: identity.user,
  };
}
