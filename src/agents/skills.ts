/**
 * Skills system - 技能系统
 * 管理 Agent 可用的工具/技能
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("skills");

const DATA_DIR = join(homedir(), ".cksbot", "data");
const SKILLS_FILE = join(DATA_DIR, "skills.json");

/**
 * 技能定义
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  builtIn: boolean;  // 是否内置技能
  config?: Record<string, unknown>;
}

/**
 * 技能存储
 */
interface SkillsStore {
  skills: Record<string, Skill>;
  version: number;
}

// 内置技能列表
const BUILT_IN_SKILLS: Skill[] = [
  // 计算机控制
  { id: "shell", name: "Shell 命令", description: "执行终端命令", category: "计算机控制", enabled: true, builtIn: true },
  { id: "read_file", name: "读取文件", description: "读取文件内容", category: "计算机控制", enabled: true, builtIn: true },
  { id: "write_file", name: "写入文件", description: "创建或修改文件", category: "计算机控制", enabled: true, builtIn: true },
  { id: "list_dir", name: "列出目录", description: "列出目录内容", category: "计算机控制", enabled: true, builtIn: true },
  { id: "cwd", name: "当前目录", description: "获取当前工作目录", category: "计算机控制", enabled: true, builtIn: true },
  { id: "cd", name: "切换目录", description: "切换工作目录", category: "计算机控制", enabled: true, builtIn: true },
  { id: "mkdir", name: "创建目录", description: "创建新目录", category: "计算机控制", enabled: true, builtIn: true },
  { id: "delete_file", name: "删除文件", description: "删除文件", category: "计算机控制", enabled: true, builtIn: true },

  // macOS 自动化
  { id: "send_message", name: "发送消息", description: "通过微信或飞书发送消息（一键操作）", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "applescript", name: "AppleScript", description: "执行 AppleScript 控制应用", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "open_app", name: "打开应用", description: "打开 macOS 应用程序", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "open_url", name: "打开网址", description: "在浏览器中打开 URL", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "get_frontmost_app", name: "获取前台应用", description: "获取当前活动的应用", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "type_text", name: "输入文本", description: "模拟键盘输入文本", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "key_press", name: "按键", description: "模拟按下键盘快捷键", category: "macOS自动化", enabled: true, builtIn: true },
  { id: "click_menu", name: "点击菜单", description: "点击应用菜单项", category: "macOS自动化", enabled: true, builtIn: true },

  // 视觉
  { id: "screenshot", name: "截图", description: "截取屏幕截图", category: "视觉", enabled: true, builtIn: true },
  { id: "screenshot_and_describe", name: "截图并描述", description: "截图并 OCR 识别内容", category: "视觉", enabled: true, builtIn: true },
  { id: "analyze_screen", name: "分析屏幕", description: "截图并用 AI 分析屏幕内容", category: "视觉", enabled: true, builtIn: true },

  // 网络搜索
  { id: "web_search", name: "网络搜索", description: "搜索网络信息（使用 UAPI 或降级到百度/Bing）", category: "网络", enabled: true, builtIn: true },

  // 邮箱
  { id: "send_email", name: "发送邮件", description: "通过 SMTP 发送电子邮件", category: "邮箱", enabled: true, builtIn: true },

  // 记忆
  { id: "remember", name: "记住", description: "记住用户信息", category: "记忆", enabled: true, builtIn: true },
  { id: "recall", name: "回忆", description: "回忆用户信息", category: "记忆", enabled: true, builtIn: true },

  // 身份
  { id: "get_identity", name: "获取身份", description: "获取助手和用户的身份信息", category: "身份", enabled: true, builtIn: true },
  { id: "set_identity", name: "设置身份", description: "设置助手或用户的名字", category: "身份", enabled: true, builtIn: true },

  // 定时任务
  { id: "schedule_message", name: "定时消息", description: "创建定时发送消息任务", category: "定时任务", enabled: true, builtIn: true },
  { id: "list_schedules", name: "任务列表", description: "查看定时任务列表", category: "定时任务", enabled: true, builtIn: true },
  { id: "delete_schedule", name: "删除任务", description: "删除定时任务", category: "定时任务", enabled: true, builtIn: true },

  // 飞书
  { id: "feishu_search_user", name: "搜索用户", description: "搜索飞书用户", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_get_user", name: "获取用户", description: "获取用户详细信息", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_send_message", name: "发送消息", description: "发送飞书消息", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_reply_message", name: "回复消息", description: "回复飞书消息", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_send_card", name: "发送卡片", description: "发送飞书卡片消息", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_list_events", name: "日程列表", description: "列出日历事件", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_create_event", name: "创建日程", description: "创建日历事件", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_get_event", name: "获取日程", description: "获取日程详情", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_create_approval", name: "创建审批", description: "创建审批实例", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_get_doc", name: "获取文档", description: "获取飞书文档", category: "飞书", enabled: true, builtIn: true },
  { id: "feishu_create_doc", name: "创建文档", description: "创建飞书文档", category: "飞书", enabled: true, builtIn: true },
];

let skillsCache: SkillsStore | null = null;

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSkills(): SkillsStore {
  if (skillsCache) return skillsCache;

  ensureDataDir();

  // 初始化内置技能
  const defaultSkills: Record<string, Skill> = {};
  for (const skill of BUILT_IN_SKILLS) {
    defaultSkills[skill.id] = skill;
  }

  if (existsSync(SKILLS_FILE)) {
    try {
      const data = readFileSync(SKILLS_FILE, "utf-8");
      const stored = JSON.parse(data) as SkillsStore;

      // 合并内置技能和存储的配置
      for (const skill of BUILT_IN_SKILLS) {
        const storedSkill = stored.skills[skill.id];
        if (storedSkill) {
          // 保留用户的 enabled 设置
          defaultSkills[skill.id] = {
            ...skill,
            enabled: storedSkill.enabled,
            config: storedSkill.config,
          };
        }
      }

      // 保留自定义技能
      for (const [id, skill] of Object.entries(stored.skills)) {
        if (!skill.builtIn) {
          defaultSkills[id] = skill;
        }
      }

      skillsCache = { skills: defaultSkills, version: stored.version };
    } catch (error) {
      logger.error("Failed to load skills", error);
      skillsCache = { skills: defaultSkills, version: 1 };
    }
  } else {
    skillsCache = { skills: defaultSkills, version: 1 };
  }

  return skillsCache;
}

function saveSkills(): void {
  if (!skillsCache) return;

  ensureDataDir();
  writeFileSync(SKILLS_FILE, JSON.stringify(skillsCache, null, 2), "utf-8");
  logger.debug("Saved skills");
}

/**
 * 获取所有技能
 */
export function getAllSkills(): Skill[] {
  const store = loadSkills();
  return Object.values(store.skills);
}

/**
 * 获取启用的技能 ID 列表
 */
export function getEnabledSkillIds(): string[] {
  const store = loadSkills();
  return Object.values(store.skills)
    .filter(s => s.enabled)
    .map(s => s.id);
}

/**
 * 检查技能是否启用
 */
export function isSkillEnabled(skillId: string): boolean {
  const store = loadSkills();
  return store.skills[skillId]?.enabled ?? false;
}

/**
 * 切换技能启用状态
 */
export function toggleSkill(skillId: string, enabled: boolean): boolean {
  const store = loadSkills();

  if (!store.skills[skillId]) {
    return false;
  }

  store.skills[skillId].enabled = enabled;
  saveSkills();

  logger.info("Toggled skill", { skillId, enabled });
  return true;
}

/**
 * 获取单个技能
 */
export function getSkill(skillId: string): Skill | undefined {
  const store = loadSkills();
  return store.skills[skillId];
}

/**
 * 添加自定义技能
 */
export function addCustomSkill(skill: Omit<Skill, "builtIn">): void {
  const store = loadSkills();
  store.skills[skill.id] = { ...skill, builtIn: false };
  saveSkills();
  logger.info("Added custom skill", { skillId: skill.id });
}

/**
 * 删除自定义技能
 */
export function removeCustomSkill(skillId: string): boolean {
  const store = loadSkills();
  const skill = store.skills[skillId];

  if (!skill || skill.builtIn) {
    return false;
  }

  delete store.skills[skillId];
  saveSkills();
  logger.info("Removed custom skill", { skillId });
  return true;
}
