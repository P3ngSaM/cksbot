/**
 * FeishuPilot UI - Main App Component
 * Apple-style Design - 苹果风格设计
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { renderDashboard } from './views/dashboard.js';
import { renderChat } from './views/chat.js';
import { renderMemory } from './views/memory.js';
import { renderSchedules } from './views/schedules.js';
import { renderSkills } from './views/skills.js';
import { renderLogs } from './views/logs.js';
import { renderSettings } from './views/settings.js';
import { renderOnboarding, type OnboardingStep } from './views/onboarding.js';
import { GatewayClient } from './gateway.js';
import type { GatewayStatus, UserProfile, ScheduledTask, Skill } from './types/index.js';
import {
  normalizeAssistantIdentity,
  normalizeUserIdentity,
  DEFAULT_ASSISTANT_NAME,
  DEFAULT_ASSISTANT_AVATAR,
  type AssistantIdentity,
  type UserIdentity,
} from './assistant-identity.js';

type TabName = 'dashboard' | 'chat' | 'memory' | 'schedules' | 'skills' | 'logs' | 'settings';

interface TabInfo {
  name: TabName;
  label: string;
  icon: string;
  group: string;
}

const TABS: TabInfo[] = [
  { name: 'dashboard', label: '仪表盘', icon: '📊', group: '主页' },
  { name: 'chat', label: '对话', icon: '💬', group: '主页' },
  { name: 'memory', label: '记忆', icon: '🧠', group: '数据' },
  { name: 'schedules', label: '定时任务', icon: '⏰', group: '数据' },
  { name: 'skills', label: '技能', icon: '🛠️', group: '配置' },
  { name: 'logs', label: '日志', icon: '📜', group: '配置' },
  { name: 'settings', label: '设置', icon: '⚙️', group: '配置' },
];

const STORAGE_KEY = 'cksbot.settings';

interface StoredSettings {
  onboardingComplete: boolean;
  botName: string;
  botAvatar: string;
  modelProvider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  feishuAppId: string;
  feishuAppSecret: string;
  feishuMode: 'websocket' | 'webhook';
}

function loadStoredSettings(): Partial<StoredSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredSettings(settings: Partial<StoredSettings>) {
  try {
    const existing = loadStoredSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...settings }));
  } catch {
    // ignore
  }
}

@customElement('cksbot-app')
export class CKSBotApp extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* ==================== Apple Design System ==================== */
    :host {
      /* Apple Colors - Light Mode */
      --bg: #F5F5F7;
      --bg-secondary: #FFFFFF;
      --bg-tertiary: #E8E8ED;

      /* Glass Effect */
      --glass-bg: rgba(255, 255, 255, 0.72);
      --glass-border: rgba(0, 0, 0, 0.04);
      --glass-blur: 20px;

      /* Text Colors */
      --text-primary: #1D1D1F;
      --text-secondary: #86868B;
      --text-tertiary: #AEAEB2;

      /* Accent - Apple Blue */
      --accent: #007AFF;
      --accent-hover: #0056CC;
      --accent-light: rgba(0, 122, 255, 0.1);

      /* Semantic Colors */
      --green: #34C759;
      --green-light: rgba(52, 199, 89, 0.12);
      --red: #FF3B30;
      --red-light: rgba(255, 59, 48, 0.12);
      --orange: #FF9500;
      --orange-light: rgba(255, 149, 0, 0.12);

      /* Borders */
      --border: rgba(0, 0, 0, 0.06);
      --border-strong: rgba(0, 0, 0, 0.1);

      /* Shadows - Apple style soft shadows */
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.12);

      /* Spacing */
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
      --spacing-2xl: 48px;

      /* Radius - Apple's rounded corners */
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --radius-2xl: 24px;
      --radius-full: 9999px;

      /* Transitions - Apple's smooth animations */
      --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
      --duration-fast: 200ms;
      --duration-normal: 350ms;
      --duration-slow: 500ms;

      /* Typography - SF Pro style */
      --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif;
      --font-mono: "SF Mono", Monaco, Consolas, monospace;

      /* Font sizes */
      --text-xs: 11px;
      --text-sm: 13px;
      --text-base: 15px;
      --text-lg: 17px;
      --text-xl: 20px;
      --text-2xl: 24px;
      --text-3xl: 32px;
      --text-4xl: 40px;
    }

    /* ==================== Layout ==================== */
    .app-shell {
      display: grid;
      grid-template-columns: 260px 1fr;
      grid-template-rows: 1fr;
      grid-template-areas: "sidebar main";
      min-height: 100vh;
      background: var(--bg);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: var(--text-base);
      -webkit-font-smoothing: antialiased;
    }

    /* ==================== Sidebar ==================== */
    .sidebar {
      grid-area: sidebar;
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      border-right: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      padding: var(--spacing-lg);
      gap: var(--spacing-lg);
    }

    .sidebar-header {
      padding: var(--spacing-sm) 0;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .sidebar-logo svg {
      width: 40px;
      height: 40px;
      filter: drop-shadow(0 2px 8px rgba(0, 122, 255, 0.3));
    }

    .sidebar-logo-text {
      font-size: var(--text-xl);
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .nav-group-title {
      font-size: var(--text-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-tertiary);
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      font-size: var(--text-sm);
      font-weight: 500;
    }

    .nav-item:hover {
      background: var(--border);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: var(--accent-light);
      color: var(--accent);
    }

    .nav-item svg {
      width: 20px;
      height: 20px;
      opacity: 0.8;
    }

    .nav-item.active svg {
      opacity: 1;
    }

    .sidebar-footer {
      padding: var(--spacing-md);
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 3px var(--green-light);
    }

    .status-indicator.offline {
      background: var(--red);
      box-shadow: 0 0 0 3px var(--red-light);
    }

    .status-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }

    /* ==================== Main Content ==================== */
    .main-wrapper {
      grid-area: main;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .header {
      padding: var(--spacing-lg) var(--spacing-xl);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
    }

    .header-title {
      font-size: var(--text-2xl);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: var(--spacing-sm);
    }

    .main-content {
      flex: 1;
      padding: var(--spacing-xl);
      overflow-y: auto;
    }

    /* ==================== Cards ==================== */
    .card {
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
      padding: var(--spacing-lg);
      box-shadow: var(--shadow-sm);
      transition: all var(--duration-normal) var(--ease-out);
    }

    .card:hover {
      box-shadow: var(--shadow-md);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .card-title {
      font-size: var(--text-lg);
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .card-title svg {
      width: 20px;
      height: 20px;
      color: var(--accent);
    }

    /* ==================== Grids ==================== */
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-lg); }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-lg); }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-lg); }

    /* ==================== Buttons ==================== */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: 10px 20px;
      font-size: var(--text-sm);
      font-weight: 500;
      border-radius: var(--radius-full);
      border: none;
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .btn:hover {
      background: var(--border-strong);
      transform: scale(1.02);
    }

    .btn:active {
      transform: scale(0.98);
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover);
    }

    .btn-secondary {
      background: var(--bg-secondary);
      border: 1px solid var(--border-strong);
    }

    .btn-sm {
      padding: 6px 14px;
      font-size: var(--text-xs);
    }

    .btn-lg {
      padding: 14px 28px;
      font-size: var(--text-base);
    }

    .btn svg {
      width: 16px;
      height: 16px;
    }

    /* ==================== Inputs ==================== */
    .input {
      width: 100%;
      padding: 12px 16px;
      font-size: var(--text-base);
      font-family: var(--font-body);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
      color: var(--text-primary);
      transition: all var(--duration-fast) var(--ease-out);
    }

    .input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-light);
    }

    .input::placeholder {
      color: var(--text-tertiary);
    }

    select.input {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2386868B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 40px;
    }

    /* ==================== Form ==================== */
    .form-group {
      margin-bottom: var(--spacing-lg);
    }

    .form-label {
      display: block;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: var(--spacing-sm);
    }

    .form-hint {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
      margin-top: var(--spacing-xs);
    }

    /* ==================== Stats ==================== */
    .stat-card-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon.green { background: var(--green-light); color: var(--green); }
    .stat-icon.blue { background: var(--accent-light); color: var(--accent); }
    .stat-icon.red { background: var(--red-light); color: var(--red); }
    .stat-icon.orange { background: var(--orange-light); color: var(--orange); }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-info { flex: 1; }

    .stat-value {
      font-size: var(--text-2xl);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .stat-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .stat-sub {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    /* ==================== Badge ==================== */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: var(--text-xs);
      font-weight: 500;
      border-radius: var(--radius-full);
    }

    .badge-success { background: var(--green-light); color: var(--green); }
    .badge-warning { background: var(--orange-light); color: var(--orange); }
    .badge-error { background: var(--red-light); color: var(--red); }
    .badge-info { background: var(--accent-light); color: var(--accent); }

    /* ==================== Table ==================== */
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .table th {
      font-weight: 500;
      font-size: var(--text-xs);
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .table tr:hover td { background: var(--bg); }

    /* ==================== List ==================== */
    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) 0;
      border-bottom: 1px solid var(--border);
    }
    .list-item:last-child { border-bottom: none; }
    .list-item-title { font-weight: 500; color: var(--text-primary); }
    .list-item-subtitle { font-size: var(--text-sm); color: var(--text-secondary); }

    /* ==================== Empty & Loading ==================== */
    .empty-state {
      text-align: center;
      padding: var(--spacing-2xl);
      color: var(--text-tertiary);
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-strong);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ==================== Switch ==================== */
    .switch { position: relative; width: 50px; height: 30px; display: inline-block; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--bg-tertiary);
      transition: var(--duration-fast) var(--ease-out);
      border-radius: var(--radius-full);
    }
    .switch-slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 2px;
      bottom: 2px;
      background: white;
      transition: var(--duration-fast) var(--ease-out);
      border-radius: 50%;
      box-shadow: var(--shadow-sm);
    }
    .switch input:checked + .switch-slider { background: var(--green); }
    .switch input:checked + .switch-slider:before { transform: translateX(20px); }

    /* ==================== Callout ==================== */
    .callout {
      padding: var(--spacing-md);
      border-radius: var(--radius-lg);
      background: var(--bg);
    }
    .callout.info { background: var(--accent-light); }
    .callout-title { font-weight: 600; margin-bottom: var(--spacing-xs); font-size: var(--text-sm); }
    .callout-content { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.5; }
    .callout a { color: var(--accent); }

    /* ==================== Chat ==================== */
    .chat-container { display: flex; flex-direction: column; height: calc(100vh - 160px); }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
      /* Apple-style scrollbar */
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
    }
    .chat-messages::-webkit-scrollbar {
      width: 6px;
    }
    .chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 3px;
    }
    .chat-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }
    /* General scrollbar styling */
    .main-content {
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
    }
    .main-content::-webkit-scrollbar {
      width: 6px;
    }
    .main-content::-webkit-scrollbar-track {
      background: transparent;
    }
    .main-content::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 3px;
    }
    .main-content::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }
    .chat-message { display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
    .chat-message.user { flex-direction: row-reverse; }
    .chat-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      flex-shrink: 0;
    }
    .chat-message.user .chat-avatar { background: var(--text-tertiary); }
    .chat-bubble {
      max-width: 70%;
      padding: var(--spacing-md);
      border-radius: var(--radius-xl);
      background: var(--bg);
    }
    .chat-message.user .chat-bubble { background: var(--accent); color: white; }
    .chat-input-container {
      padding: var(--spacing-md);
      border-top: 1px solid var(--border);
      display: flex;
      gap: var(--spacing-sm);
    }
    .chat-input { flex: 1; }

    /* ==================== ONBOARDING ==================== */
    .onboarding-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: var(--spacing-xl);
    }

    .onboarding-content {
      width: 100%;
      max-width: 480px;
    }

    .onboarding-step {
      text-align: center;
    }

    .onboarding-logo {
      margin-bottom: var(--spacing-xl);
    }

    .onboarding-title {
      font-size: var(--text-4xl);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md);
      line-height: 1.1;
    }

    .onboarding-subtitle {
      font-size: var(--text-lg);
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-2xl);
      line-height: 1.4;
    }

    .onboarding-features {
      text-align: left;
      margin-bottom: var(--spacing-2xl);
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md) 0;
      color: var(--text-primary);
      font-size: var(--text-base);
    }

    .feature-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      background: var(--accent-light);
      color: var(--accent);
      flex-shrink: 0;
    }

    .feature-icon svg {
      width: 22px;
      height: 22px;
    }

    .onboarding-actions {
      display: flex;
      justify-content: center;
      gap: var(--spacing-md);
      margin-top: var(--spacing-xl);
    }

    .onboarding-progress {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-2xl);
    }

    .progress-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--border-strong);
      transition: all var(--duration-normal) var(--ease-out);
    }

    .progress-dot.active { background: var(--text-tertiary); }
    .progress-dot.current {
      background: var(--accent);
      width: 24px;
      border-radius: var(--radius-full);
    }

    .step-header {
      margin-bottom: var(--spacing-xl);
    }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      margin: 0 auto var(--spacing-lg);
      border-radius: var(--radius-2xl);
      background: var(--accent-light);
      color: var(--accent);
    }

    .step-icon svg {
      width: 40px;
      height: 40px;
    }

    .step-title {
      font-size: var(--text-3xl);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm);
    }

    .step-subtitle {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin: 0;
    }

    .config-form { text-align: left; }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .radio-item {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .radio-item:hover {
      border-color: var(--text-tertiary);
      background: var(--bg);
    }

    .radio-item.active {
      border-color: var(--accent);
      background: var(--accent-light);
    }

    .radio-item input { margin-top: 4px; accent-color: var(--accent); }

    .radio-label { display: flex; flex-direction: column; }
    .radio-label strong { color: var(--text-primary); font-weight: 500; }
    .radio-label small { color: var(--text-secondary); font-size: var(--text-xs); margin-top: 2px; }

    .avatar-picker {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
    }

    .avatar-option {
      width: 52px;
      height: 52px;
      font-size: var(--text-xl);
      font-weight: 600;
      border: 2px solid var(--border-strong);
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .avatar-option:hover {
      border-color: var(--text-tertiary);
      transform: scale(1.05);
    }

    .avatar-option.selected {
      border-color: var(--accent);
      background: var(--accent-light);
      color: var(--accent);
    }

    .preview-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
      margin-top: var(--spacing-lg);
      box-shadow: var(--shadow-sm);
    }

    .preview-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent) 0%, #5856D6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-xl);
      font-weight: 600;
      color: white;
    }

    .preview-name {
      font-weight: 600;
      font-size: var(--text-lg);
      color: var(--text-primary);
    }

    .preview-status {
      font-size: var(--text-sm);
      color: var(--green);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .preview-status::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
    }

    .complete-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      margin: 0 auto var(--spacing-xl);
      border-radius: 50%;
      background: var(--green-light);
      color: var(--green);
    }

    .complete-icon svg {
      width: 50px;
      height: 50px;
    }

    .complete-summary {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      margin: var(--spacing-xl) 0;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--green-light);
      border-radius: var(--radius-lg);
      color: var(--green);
      font-weight: 500;
    }

    .summary-item svg {
      width: 18px;
      height: 18px;
    }

    .complete-tips {
      text-align: left;
      padding: var(--spacing-lg);
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
      margin-bottom: var(--spacing-lg);
      box-shadow: var(--shadow-sm);
    }

    .complete-tips h3 {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md);
    }

    .complete-tips ul {
      margin: 0;
      padding-left: var(--spacing-lg);
      color: var(--text-secondary);
      font-size: var(--text-sm);
      line-height: 1.8;
    }

    /* ==================== Animation ==================== */
    .animate-rise {
      animation: rise var(--duration-slow) var(--ease-out) forwards;
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ==================== Title Icon ==================== */
    .title-icon {
      display: inline-flex;
      margin-right: var(--spacing-sm);
      color: var(--accent);
    }

    .title-icon svg {
      width: 20px;
      height: 20px;
    }

    /* ==================== Action Buttons ==================== */
    .action-btn {
      justify-content: flex-start;
      width: 100%;
      border-radius: var(--radius-lg);
    }

    .action-btn:hover {
      transform: translateX(4px);
    }

    .btn-icon {
      display: inline-flex;
    }

    .btn-icon svg {
      width: 18px;
      height: 18px;
    }
  `;

  @state() activeTab: TabName = 'dashboard';
  @state() connected = false;
  @state() status: GatewayStatus | null = null;
  @state() users: UserProfile[] = [];
  @state() schedules: ScheduledTask[] = [];
  @state() skills: Skill[] = [];
  @state() logs: string[] = [];
  @state() chatMessages: Array<{ role: string; content: string }> = [];
  @state() chatInput = '';
  @state() chatLoading = false;
  @state() chatStreaming = false;  // 流式输出中
  @state() isFirstMessage = true;
  // 对话历史
  @state() conversations: Array<{
    sessionId: string;
    title: string;
    preview: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }> = [];
  @state() currentSessionId = 'web-chat';  // 当前对话 ID

  // Voice state
  @state() isRecording = false;
  @state() voiceEnabled = true;
  @state() isRealtimeVoice = false;
  @state() realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' = 'disconnected';
  @state() realtimeTranscript = '';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private realtimeAudioContext: AudioContext | null = null;
  private realtimeMediaStream: MediaStream | null = null;
  private realtimeProcessor: ScriptProcessorNode | null = null;

  // Assistant & User Identity
  @state() assistantIdentity: AssistantIdentity = normalizeAssistantIdentity({});
  @state() userIdentity: UserIdentity = normalizeUserIdentity({});
  @state() identityLoaded = false;

  // Onboarding state
  @state() showOnboarding = false;
  @state() onboardingStep: OnboardingStep = 'welcome';
  @state() modelProvider = 'minimax';
  @state() modelName = 'MiniMax-M2.1';
  @state() apiKey = '';
  @state() baseUrl = 'https://api.minimaxi.com/anthropic';
  @state() feishuAppId = '';
  @state() feishuAppSecret = '';
  @state() feishuMode: 'websocket' | 'webhook' = 'websocket';
  @state() botName = '';
  @state() botAvatar = 'F';

  private client: GatewayClient;

  constructor() {
    super();
    this.client = new GatewayClient();
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
    this.checkOnboarding();
    this.handleRouting();
    window.addEventListener('popstate', () => this.handleRouting());
  }

  private loadSettings() {
    const settings = loadStoredSettings();
    if (settings.botName) this.botName = settings.botName;
    if (settings.botAvatar) this.botAvatar = settings.botAvatar;
    if (settings.modelProvider) this.modelProvider = settings.modelProvider;
    if (settings.modelName) this.modelName = settings.modelName;
    if (settings.apiKey) this.apiKey = settings.apiKey;
    if (settings.baseUrl) this.baseUrl = settings.baseUrl;
    if (settings.feishuAppId) this.feishuAppId = settings.feishuAppId;
    if (settings.feishuAppSecret) this.feishuAppSecret = settings.feishuAppSecret;
    if (settings.feishuMode) this.feishuMode = settings.feishuMode;
  }

  private checkOnboarding() {
    const settings = loadStoredSettings();
    const params = new URLSearchParams(window.location.search);
    const forceOnboarding = params.get('onboarding') === 'true';

    if (forceOnboarding || !settings.onboardingComplete) {
      this.showOnboarding = true;
    } else {
      this.initializeApp();
    }
  }

  private handleRouting() {
    if (this.showOnboarding) return;
    const path = window.location.pathname.replace('/', '') || 'dashboard';
    if (TABS.find(t => t.name === path)) {
      this.activeTab = path as TabName;
    }
  }

  private async initializeApp() {
    try {
      await this.client.connect();
      this.connected = true;
      await this.loadStatus();
      await this.loadIdentity();
      await this.loadChatHistory();
      await this.loadData();
    } catch (error) {
      console.error('Failed to connect to gateway:', error);
    }
  }

  /**
   * Load chat history from backend
   */
  private async loadChatHistory() {
    try {
      // 加载对话列表
      const listRes = await this.client.request('chat.list');
      if (listRes?.conversations) {
        this.conversations = listRes.conversations;
        // 如果有历史对话，使用最新的那个
        if (this.conversations.length > 0 && this.currentSessionId === 'web-chat') {
          this.currentSessionId = this.conversations[0].sessionId;
        }
      }

      // 加载当前对话的消息
      const res = await this.client.request('chat.history', { sessionId: this.currentSessionId });
      if (res?.messages && res.messages.length > 0) {
        this.chatMessages = res.messages;
        this.isFirstMessage = false;
        // Scroll to bottom after loading history
        setTimeout(() => this.scrollChatToBottom(), 100);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  /**
   * Create a new conversation
   */
  private async createNewConversation() {
    try {
      const res = await this.client.request('chat.new');
      if (res?.sessionId) {
        this.currentSessionId = res.sessionId;
        this.chatMessages = [];
        this.isFirstMessage = true;
        // 刷新对话列表
        await this.loadChatHistory();
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  }

  /**
   * Select a conversation
   */
  private async selectConversation(sessionId: string) {
    if (sessionId === this.currentSessionId) return;

    this.currentSessionId = sessionId;
    this.chatMessages = [];

    try {
      const res = await this.client.request('chat.history', { sessionId });
      if (res?.messages) {
        this.chatMessages = res.messages;
        this.isFirstMessage = this.chatMessages.length === 0;
        setTimeout(() => this.scrollChatToBottom(), 100);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  /**
   * Delete a conversation
   */
  private async deleteConversation(sessionId: string) {
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      await this.client.request('chat.delete', { sessionId });
      // 从列表中移除
      this.conversations = this.conversations.filter(c => c.sessionId !== sessionId);
      // 如果删除的是当前对话，切换到最新的对话或创建新对话
      if (sessionId === this.currentSessionId) {
        if (this.conversations.length > 0) {
          await this.selectConversation(this.conversations[0].sessionId);
        } else {
          await this.createNewConversation();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  /**
   * Load assistant and user identity from gateway/memory
   * If no identity is set, trigger onboarding to the profile step
   */
  private async loadIdentity() {
    try {
      const res = await this.client.request('agent.identity.get', {});
      if (res) {
        this.assistantIdentity = normalizeAssistantIdentity(res.assistant);
        this.userIdentity = normalizeUserIdentity(res.user);
      }
      this.identityLoaded = true;

      // If no identity is configured (first time), check localStorage
      if (
        this.assistantIdentity.name === DEFAULT_ASSISTANT_NAME &&
        !this.userIdentity.name
      ) {
        // Check if onboarding was already completed but identity wasn't saved to backend
        const settings = loadStoredSettings();
        if (settings.onboardingComplete && settings.botName) {
          // Use stored settings as fallback and sync to backend
          this.assistantIdentity = normalizeAssistantIdentity({
            name: settings.botName,
            avatar: settings.botAvatar,
          });
          // Sync to backend
          try {
            await this.client.request('agent.identity.set', {
              assistant: {
                name: settings.botName,
                avatar: settings.botAvatar || 'A',
              },
            });
            console.log('Synced localStorage identity to backend');
          } catch (e) {
            console.error('Failed to sync identity to backend:', e);
          }
        } else {
          // First time user - show onboarding profile step
          this.isFirstMessage = true;
        }
      }
    } catch (error) {
      console.error('Failed to load identity:', error);
      // Fallback to stored settings
      const settings = loadStoredSettings();
      if (settings.botName) {
        this.assistantIdentity = normalizeAssistantIdentity({
          name: settings.botName,
          avatar: settings.botAvatar,
        });
      }
      this.identityLoaded = true;
    }
  }

  private async loadStatus() {
    try {
      this.status = await this.client.request('status');
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }

  private async loadData() {
    try {
      const [users, schedules, skills] = await Promise.all([
        this.client.request('memory.users'),
        this.client.request('schedules.list'),
        this.client.request('skills.list'),
      ]);
      this.users = users?.users ?? [];
      this.schedules = schedules?.tasks ?? [];
      this.skills = skills?.skills ?? [];
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private navigateTo(tab: TabName) {
    this.activeTab = tab;
    window.history.pushState({}, '', `/${tab}`);
  }

  private async sendChatMessage() {
    if (!this.chatInput.trim() || this.chatLoading || this.chatStreaming) return;

    const userMessage = this.chatInput.trim();
    this.chatInput = '';
    this.chatMessages = [...this.chatMessages, { role: 'user', content: userMessage }];
    this.chatStreaming = true;

    // Scroll to bottom after adding user message
    this.scrollChatToBottom();

    // Add empty assistant message for streaming
    const assistantMsgIndex = this.chatMessages.length;
    this.chatMessages = [...this.chatMessages, { role: 'assistant', content: '' }];

    try {
      let streamedContent = '';

      const response = await this.client.requestStream('agent.run', {
        sessionId: this.currentSessionId,
        message: userMessage,
      }, (event) => {
        // Handle streaming events
        if (event.type === 'text_delta') {
          streamedContent += event.text;
          // Update the assistant message in real-time
          this.chatMessages = this.chatMessages.map((msg, idx) =>
            idx === assistantMsgIndex ? { ...msg, content: streamedContent } : msg
          );
          this.requestUpdate();
          // Auto-scroll while streaming
          this.scrollChatToBottom();
        }
      });

      // Update with final content (includes any content from tool calls)
      this.chatMessages = this.chatMessages.map((msg, idx) =>
        idx === assistantMsgIndex ? { ...msg, content: response.content || streamedContent } : msg
      );

      // Check if identity was updated (e.g., user introduced themselves)
      if (response.identityUpdated) {
        await this.loadIdentity();
        // Save to localStorage as well
        saveStoredSettings({
          botName: this.assistantIdentity.name,
          botAvatar: this.assistantIdentity.avatar || DEFAULT_ASSISTANT_AVATAR,
        });
      }

      // First message completed
      this.isFirstMessage = false;

      // Final scroll to bottom
      this.scrollChatToBottom();

      // 刷新对话列表（更新预览和时间）
      this.refreshConversationList();
    } catch (error) {
      // Update the empty message with error
      this.chatMessages = this.chatMessages.map((msg, idx) =>
        idx === assistantMsgIndex ? { ...msg, content: '抱歉，处理请求时出错。' } : msg
      );
    } finally {
      this.chatStreaming = false;
    }
  }

  /**
   * Refresh conversation list without changing current conversation
   */
  private async refreshConversationList() {
    try {
      const listRes = await this.client.request('chat.list');
      if (listRes?.conversations) {
        this.conversations = listRes.conversations;
      }
    } catch (error) {
      console.error('Failed to refresh conversation list:', error);
    }
  }

  /**
   * Scroll chat messages to bottom
   */
  private scrollChatToBottom() {
    requestAnimationFrame(() => {
      const chatMessages = this.shadowRoot?.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  }

  /**
   * Toggle voice recording
   */
  private async toggleVoiceRecording() {
    if (this.isRecording) {
      // Stop recording
      this.stopRecording();
    } else {
      // Start recording
      await this.startRecording();
    }
  }

  /**
   * Start voice recording
   */
  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processVoiceInput(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  }

  /**
   * Stop voice recording
   */
  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
  }

  /**
   * Process voice input - convert to text and send
   */
  private async processVoiceInput(audioBlob: Blob) {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Send to STT service
      const result = await this.client.speechToText(base64);

      if (result.success && result.text) {
        // Set input and optionally auto-send
        this.chatInput = result.text;
        // Auto-send the voice message
        await this.sendChatMessage();
      } else {
        console.error('STT failed:', result.error);
        alert('语音识别失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to process voice:', error);
    }
  }

  /**
   * Speak a message using TTS
   */
  private async speakMessage(text: string) {
    try {
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      // Request TTS
      const result = await this.client.textToSpeech(text);

      if (result.success && result.audioBase64) {
        // Create audio element and play
        const audioData = atob(result.audioBase64);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        this.currentAudio = new Audio(url);
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(url);
          this.currentAudio = null;
        };
        await this.currentAudio.play();
      } else {
        console.error('TTS failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to speak message:', error);
    }
  }

  /**
   * Toggle realtime voice conversation
   * 使用 Gemini Live API 实现双向实时语音对话
   */
  private async toggleRealtimeVoice() {
    if (this.isRealtimeVoice) {
      this.stopRealtimeVoice();
    } else {
      await this.startRealtimeVoice();
    }
  }

  /**
   * Start realtime voice conversation (Gemini Live API)
   */
  private async startRealtimeVoice() {
    try {
      this.isRealtimeVoice = true;
      this.realtimeStatus = 'connecting';
      this.realtimeTranscript = '';

      // Get microphone access
      this.realtimeMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Connect to Gemini Live API
      this.client.connectRealtimeVoice({
        systemPrompt: `你是${this.assistantIdentity.name}，一个友好的AI助手。${this.userIdentity.name ? `用户的名字是${this.userIdentity.name}。` : ''}请用简洁自然的中文回复，保持对话流畅。`,
        voice: 'Cherry',  // Qwen voice: Chelsie, Serena, Ethan, Cherry
        onEvent: (event) => this.handleRealtimeEvent(event),
      });

      // Set up audio processing for sending to Gemini
      this.realtimeAudioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.realtimeAudioContext.createMediaStreamSource(this.realtimeMediaStream);
      this.realtimeProcessor = this.realtimeAudioContext.createScriptProcessor(4096, 1, 1);

      this.realtimeProcessor.onaudioprocess = (e) => {
        if (this.realtimeStatus === 'connected' || this.realtimeStatus === 'listening') {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32Array to Int16Array (PCM 16-bit)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
          }
          // Convert to base64
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          this.client.sendRealtimeAudio(base64);
        }
      };

      source.connect(this.realtimeProcessor);
      this.realtimeProcessor.connect(this.realtimeAudioContext.destination);

    } catch (error) {
      console.error('Failed to start realtime voice:', error);
      alert('无法启动实时语音：' + (error instanceof Error ? error.message : '未知错误'));
      this.stopRealtimeVoice();
    }
  }

  /**
   * Stop realtime voice conversation
   */
  private stopRealtimeVoice() {
    // Disconnect from Gemini Live
    this.client.disconnectRealtimeVoice();

    // Clean up audio processing
    if (this.realtimeProcessor) {
      this.realtimeProcessor.disconnect();
      this.realtimeProcessor = null;
    }
    if (this.realtimeAudioContext) {
      this.realtimeAudioContext.close();
      this.realtimeAudioContext = null;
    }
    if (this.realtimeMediaStream) {
      this.realtimeMediaStream.getTracks().forEach(track => track.stop());
      this.realtimeMediaStream = null;
    }

    this.isRealtimeVoice = false;
    this.realtimeStatus = 'disconnected';
    this.realtimeTranscript = '';
  }

  /**
   * Handle realtime voice events (Voice Agent: ASR + Agent + TTS)
   */
  private userTranscriptBuffer = '';  // 用户语音转写缓冲

  private handleRealtimeEvent(event: import('./gateway.js').RealtimeVoiceEvent) {
    console.log('Realtime event:', event);

    switch (event.type) {
      case 'connected':
        this.realtimeStatus = 'connecting';
        this.realtimeTranscript = '正在连接...';
        break;

      case 'setup_complete':
        this.realtimeStatus = 'listening';
        this.realtimeTranscript = '请说话...';
        break;

      case 'listening':
        this.realtimeStatus = 'listening';
        this.realtimeTranscript = '请说话...';
        break;

      case 'speech_started':
        // 用户开始说话
        this.realtimeStatus = 'listening';
        this.userTranscriptBuffer = '';
        this.realtimeTranscript = '🎤 正在听...';
        break;

      case 'speech_stopped':
        // 用户停止说话
        break;

      case 'user_transcript':
        // 用户语音转写
        if (event.text) {
          this.userTranscriptBuffer = event.text;  // 替换而不是累积
          this.realtimeTranscript = '🎤 ' + this.userTranscriptBuffer;

          if (event.isFinal) {
            // 最终转写结果，添加到聊天记录
            this.chatMessages = [...this.chatMessages, { role: 'user', content: event.text }];
            this.userTranscriptBuffer = '';
            this.scrollChatToBottom();
          }
        }
        break;

      case 'thinking':
        // Agent 正在思考
        this.realtimeStatus = 'connected';
        this.realtimeTranscript = '🤔 思考中...';
        break;

      case 'text':
        // Agent 回复的文本
        if (event.text) {
          if (event.isFinal) {
            // Add assistant message to chat
            this.chatMessages = [...this.chatMessages, { role: 'assistant', content: event.text }];
            this.realtimeTranscript = '';
            this.scrollChatToBottom();
          } else {
            this.realtimeTranscript = event.text;
          }
        }
        break;

      case 'speaking':
        // 正在播放语音
        this.realtimeStatus = 'speaking';
        break;

      case 'audio_data':
        // Play audio response
        this.realtimeStatus = 'speaking';
        if (event.data) {
          this.playRealtimeAudioPCM(event.data);
        }
        break;

      case 'turn_complete':
        this.realtimeStatus = 'listening';
        this.realtimeTranscript = '请说话...';
        break;

      case 'interrupted':
        this.realtimeStatus = 'listening';
        break;

      case 'error':
        console.error('Realtime voice error:', event.message);
        alert('实时语音错误：' + event.message);
        this.stopRealtimeVoice();
        break;

      case 'disconnected':
        this.stopRealtimeVoice();
        break;
    }
  }

  /**
   * Play realtime audio from PCM base64 (Gemini outputs 24kHz PCM)
   */
  private realtimeAudioQueue: string[] = [];
  private isPlayingRealtimeAudio = false;

  private async playRealtimeAudioPCM(base64: string) {
    this.realtimeAudioQueue.push(base64);
    if (!this.isPlayingRealtimeAudio) {
      this.processRealtimeAudioQueue();
    }
  }

  private async processRealtimeAudioQueue() {
    if (this.realtimeAudioQueue.length === 0) {
      this.isPlayingRealtimeAudio = false;
      return;
    }

    this.isPlayingRealtimeAudio = true;
    const base64 = this.realtimeAudioQueue.shift()!;

    try {
      // Decode base64 to PCM bytes
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create AudioContext for playback (24kHz from Gemini)
      const audioContext = new AudioContext({ sampleRate: 24000 });

      // Convert PCM 16-bit to Float32
      const pcmData = new Int16Array(bytes.buffer);
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768;
      }

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      // Play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        audioContext.close();
        this.processRealtimeAudioQueue();
      };
      source.start();
    } catch (error) {
      console.error('Failed to play realtime audio:', error);
      this.processRealtimeAudioQueue();
    }
  }

  private async deleteSchedule(taskId: string) {
    try {
      await this.client.request('schedules.delete', { taskId });
      this.schedules = this.schedules.filter(s => s.id !== taskId);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  }

  private async toggleSkill(skillId: string, enabled: boolean) {
    try {
      await this.client.request('skills.toggle', { skillId, enabled });
      this.skills = this.skills.map(s =>
        s.id === skillId ? { ...s, enabled } : s
      );
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  }

  // Onboarding methods
  private onboardingNext() {
    const steps: OnboardingStep[] = ['welcome', 'model', 'feishu', 'profile', 'complete'];
    const currentIndex = steps.indexOf(this.onboardingStep);
    if (currentIndex < steps.length - 1) {
      this.onboardingStep = steps[currentIndex + 1];
    }
  }

  private onboardingBack() {
    const steps: OnboardingStep[] = ['welcome', 'model', 'feishu', 'profile', 'complete'];
    const currentIndex = steps.indexOf(this.onboardingStep);
    if (currentIndex > 0) {
      this.onboardingStep = steps[currentIndex - 1];
    }
  }

  private onboardingSkip() {
    this.onboardingNext();
  }

  private async onboardingComplete() {
    saveStoredSettings({
      onboardingComplete: true,
      botName: this.botName || 'AI 助手',
      botAvatar: this.botAvatar,
      modelProvider: this.modelProvider,
      modelName: this.modelName,
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      feishuAppId: this.feishuAppId,
      feishuAppSecret: this.feishuAppSecret,
      feishuMode: this.feishuMode,
    });
    this.showOnboarding = false;
    await this.initializeApp();

    // Sync identity to backend after connection established
    try {
      await this.client.request('agent.identity.set', {
        assistant: {
          name: this.botName || 'AI 助手',
          avatar: this.botAvatar || 'A',
        },
      });
      console.log('Identity synced to backend');
    } catch (error) {
      console.error('Failed to sync identity:', error);
    }

    window.history.replaceState({}, '', '/');
  }

  private renderSidebar() {
    const groups = [...new Set(TABS.map(t => t.group))];

    // SVG icons for navigation
    const navIcons: Record<TabName, ReturnType<typeof html>> = {
      dashboard: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
      chat: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      memory: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
      schedules: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      skills: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      logs: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      settings: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    };

    return html`
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <svg viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="appleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#007AFF"/>
                  <stop offset="100%" style="stop-color:#5856D6"/>
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="10" fill="url(#appleGrad)"/>
              <text x="20" y="27" font-family="system-ui" font-size="20" font-weight="600" fill="white" text-anchor="middle">F</text>
            </svg>
            <img src="/cks-logo.png" alt="CKS Bot" style="width: 32px; height: 32px; border-radius: 8px;" />
            <span class="sidebar-logo-text">CKS Bot</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${groups.map(group => html`
            <div class="nav-group">
              <div class="nav-group-title">${group}</div>
              ${TABS.filter(t => t.group === group).map(tab => html`
                <div
                  class="nav-item ${this.activeTab === tab.name ? 'active' : ''}"
                  @click=${() => this.navigateTo(tab.name)}
                >
                  ${navIcons[tab.name]}
                  <span>${tab.label}</span>
                </div>
              `)}
            </div>
          `)}
        </nav>

        <div class="sidebar-footer">
          <div class="status-indicator ${this.connected ? '' : 'offline'}"></div>
          <span class="status-text">${this.connected ? '已连接' : '未连接'}</span>
        </div>
      </aside>
    `;
  }

  private renderHeader() {
    const currentTab = TABS.find(t => t.name === this.activeTab);
    return html`
      <header class="header">
        <h1 class="header-title">${currentTab?.label}</h1>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" @click=${() => this.loadData()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            刷新
          </button>
        </div>
      </header>
    `;
  }

  private renderContent() {
    switch (this.activeTab) {
      case 'dashboard':
        return renderDashboard({
          status: this.status,
          userCount: this.users.length,
          scheduleCount: this.schedules.length,
          skillCount: this.skills.filter(s => s.enabled).length,
        });
      case 'chat':
        return renderChat({
          messages: this.chatMessages,
          input: this.chatInput,
          loading: this.chatStreaming,  // Use streaming state, not loading
          assistantName: this.assistantIdentity.name,
          assistantAvatar: this.assistantIdentity.avatar || DEFAULT_ASSISTANT_AVATAR,
          userName: this.userIdentity.name,
          isFirstMessage: this.isFirstMessage && this.chatMessages.length === 0,
          isRecording: this.isRecording,
          voiceEnabled: this.voiceEnabled,
          isRealtimeVoice: this.isRealtimeVoice,
          realtimeStatus: this.realtimeStatus,
          realtimeTranscript: this.realtimeTranscript,
          // 对话历史
          conversations: this.conversations,
          currentSessionId: this.currentSessionId,
          onInputChange: (value: string) => { this.chatInput = value; },
          onSend: () => this.sendChatMessage(),
          onVoiceToggle: () => this.toggleVoiceRecording(),
          onSpeakMessage: (text: string) => this.speakMessage(text),
          onRealtimeVoiceToggle: () => this.toggleRealtimeVoice(),
          // 对话历史操作
          onNewConversation: () => this.createNewConversation(),
          onSelectConversation: (sessionId: string) => this.selectConversation(sessionId),
          onDeleteConversation: (sessionId: string) => this.deleteConversation(sessionId),
        });
      case 'memory':
        return renderMemory({ users: this.users });
      case 'schedules':
        return renderSchedules({
          schedules: this.schedules,
          onDelete: (id: string) => this.deleteSchedule(id),
        });
      case 'skills':
        return renderSkills({
          skills: this.skills,
          onToggle: (id: string, enabled: boolean) => this.toggleSkill(id, enabled),
        });
      case 'logs':
        return renderLogs({ logs: this.logs });
      case 'settings':
        return renderSettings({});
      default:
        return html`<div class="empty-state">页面不存在</div>`;
    }
  }

  render() {
    if (this.showOnboarding) {
      return renderOnboarding({
        step: this.onboardingStep,
        modelProvider: this.modelProvider,
        modelName: this.modelName,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        feishuAppId: this.feishuAppId,
        feishuAppSecret: this.feishuAppSecret,
        feishuMode: this.feishuMode,
        botName: this.botName,
        botAvatar: this.botAvatar,
        onModelProviderChange: (v) => { this.modelProvider = v; },
        onModelNameChange: (v) => { this.modelName = v; },
        onApiKeyChange: (v) => { this.apiKey = v; },
        onBaseUrlChange: (v) => { this.baseUrl = v; },
        onFeishuAppIdChange: (v) => { this.feishuAppId = v; },
        onFeishuAppSecretChange: (v) => { this.feishuAppSecret = v; },
        onFeishuModeChange: (v) => { this.feishuMode = v; },
        onBotNameChange: (v) => { this.botName = v; },
        onBotAvatarChange: (v) => { this.botAvatar = v; },
        onNext: () => this.onboardingNext(),
        onBack: () => this.onboardingBack(),
        onSkip: () => this.onboardingSkip(),
        onComplete: () => this.onboardingComplete(),
      });
    }

    return html`
      <div class="app-shell">
        ${this.renderSidebar()}
        <div class="main-wrapper">
          ${this.renderHeader()}
          <main class="main-content">
            ${this.renderContent()}
          </main>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cksbot-app': CKSBotApp;
  }
}
