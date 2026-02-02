/**
 * Schedules View - 定时任务视图
 */

import { html } from 'lit';
import type { ScheduledTask } from '../types/index.js';

interface SchedulesProps {
  schedules: ScheduledTask[];
  onDelete: (id: string) => void;
}

export function renderSchedules(props: SchedulesProps) {
  const { schedules, onDelete } = props;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getRepeatLabel = (repeat?: string) => {
    switch (repeat) {
      case 'daily': return '每天';
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      case 'once': return '一次性';
      default: return '-';
    }
  };

  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">⏰ 定时任务</h3>
        <button class="btn btn-primary btn-sm">
          ➕ 新建任务
        </button>
      </div>

      ${schedules.length === 0
        ? html`
          <div class="empty-state">
            <div style="font-size: 3rem;">⏰</div>
            <h3>暂无定时任务</h3>
            <p>通过对话创建定时任务，例如："每天早上9点提醒我喝水"</p>
          </div>
        `
        : html`
          <table class="table">
            <thead>
              <tr>
                <th>任务ID</th>
                <th>内容</th>
                <th>类型</th>
                <th>重复</th>
                <th>状态</th>
                <th>下次执行</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${schedules.map(task => html`
                <tr>
                  <td>
                    <code style="font-size: 0.75rem;">${task.id.substring(0, 12)}...</code>
                  </td>
                  <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${task.action.content}
                  </td>
                  <td>
                    <span class="badge ${task.action.type === 'send_message' ? 'badge-info' : 'badge-warning'}">
                      ${task.action.type === 'send_message' ? '📨 消息' : '🤖 Agent'}
                    </span>
                  </td>
                  <td>${getRepeatLabel(task.repeat)}</td>
                  <td>
                    ${task.enabled
                      ? html`<span class="badge badge-success">启用</span>`
                      : html`<span class="badge badge-error">禁用</span>`
                    }
                  </td>
                  <td style="font-size: 0.875rem; color: var(--color-text-secondary);">
                    ${formatDate(task.executeAt)}
                  </td>
                  <td>
                    <button
                      class="btn btn-danger btn-sm"
                      @click=${() => onDelete(task.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `
      }
    </div>

    <div class="card" style="margin-top: var(--spacing-lg);">
      <div class="card-header">
        <h3 class="card-title">💡 使用提示</h3>
      </div>
      <div style="color: var(--color-text-secondary); font-size: 0.875rem;">
        <p style="margin-bottom: var(--spacing-sm);">你可以通过飞书对话创建定时任务，例如：</p>
        <ul style="padding-left: var(--spacing-lg); margin: 0;">
          <li>"每天早上8点给我发早安问候"</li>
          <li>"明天下午3点提醒我开会"</li>
          <li>"每周一早上9点提醒我写周报"</li>
          <li>"3分钟后提醒我休息"</li>
        </ul>
      </div>
    </div>
  `;
}
