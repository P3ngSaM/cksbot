/**
 * Dashboard View - 仪表盘视图
 * Apple-style Design
 */

import { html } from 'lit';
import type { GatewayStatus } from '../types/index.js';

// SF Symbols style icons
const icons = {
  checkmark: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  xmark: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
  person2: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  clock: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  wrench: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  chartBar: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
  bolt: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  bubble: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  brain: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>`,
  gear: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
};

interface DashboardProps {
  status: GatewayStatus | null;
  userCount: number;
  scheduleCount: number;
  skillCount: number;
}

export function renderDashboard(props: DashboardProps) {
  const { status, userCount, scheduleCount, skillCount } = props;

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天 ${hours % 24}小时`;
    if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟`;
    return `${seconds}秒`;
  };

  return html`
    <div class="grid-4">
      <!-- Status Card -->
      <div class="card stat-card-container">
        <div class="stat-icon ${status ? 'green' : 'red'}">
          ${status ? icons.checkmark : icons.xmark}
        </div>
        <div class="stat-info">
          <div class="stat-value">${status ? '运行中' : '离线'}</div>
          <div class="stat-label">网关状态</div>
          <div class="stat-sub">${status ? `v${status.version}` : '未连接'}</div>
        </div>
      </div>

      <!-- Users Card -->
      <div class="card stat-card-container">
        <div class="stat-icon blue">
          ${icons.person2}
        </div>
        <div class="stat-info">
          <div class="stat-value">${userCount}</div>
          <div class="stat-label">用户数</div>
          <div class="stat-sub">记忆中的用户</div>
        </div>
      </div>

      <!-- Schedules Card -->
      <div class="card stat-card-container">
        <div class="stat-icon orange">
          ${icons.clock}
        </div>
        <div class="stat-info">
          <div class="stat-value">${scheduleCount}</div>
          <div class="stat-label">定时任务</div>
          <div class="stat-sub">活跃任务数</div>
        </div>
      </div>

      <!-- Skills Card -->
      <div class="card stat-card-container">
        <div class="stat-icon blue">
          ${icons.wrench}
        </div>
        <div class="stat-info">
          <div class="stat-value">${skillCount}</div>
          <div class="stat-label">启用技能</div>
          <div class="stat-sub">可用工具数</div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top: var(--spacing-lg);">
      <!-- System Info -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            ${icons.chartBar}
            系统信息
          </h3>
        </div>
        <div>
          <div class="list-item">
            <div class="list-item-title">运行时间</div>
            <div class="list-item-subtitle">${status ? formatUptime(status.uptime) : '-'}</div>
          </div>
          <div class="list-item">
            <div class="list-item-title">活跃会话</div>
            <div class="list-item-subtitle">${status?.activeSessions ?? 0} 个</div>
          </div>
          <div class="list-item">
            <div class="list-item-title">飞书通道</div>
            <div>
              ${status?.channels?.find(c => c.type === 'feishu')?.status === 'running'
                ? html`<span class="badge badge-success">运行中</span>`
                : html`<span class="badge badge-error">未连接</span>`
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            ${icons.bolt}
            快速操作
          </h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
          <button class="btn btn-primary action-btn">
            <span class="btn-icon">${icons.bubble}</span>
            开始对话
          </button>
          <button class="btn btn-secondary action-btn">
            <span class="btn-icon">${icons.clock}</span>
            创建定时任务
          </button>
          <button class="btn btn-secondary action-btn">
            <span class="btn-icon">${icons.brain}</span>
            查看记忆
          </button>
          <button class="btn btn-secondary action-btn">
            <span class="btn-icon">${icons.gear}</span>
            系统设置
          </button>
        </div>
      </div>
    </div>
  `;
}
