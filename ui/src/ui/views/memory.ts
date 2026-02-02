/**
 * Memory View - 记忆视图
 */

import { html } from 'lit';
import type { UserProfile } from '../types/index.js';

interface MemoryProps {
  users: UserProfile[];
}

export function renderMemory(props: MemoryProps) {
  const { users } = props;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">🧠 用户记忆</h3>
        <span class="badge badge-info">${users.length} 个用户</span>
      </div>

      ${users.length === 0
        ? html`
          <div class="empty-state">
            <div style="font-size: 3rem;">🧠</div>
            <h3>暂无记忆</h3>
            <p>与用户对话后，系统会自动记住重要信息</p>
          </div>
        `
        : html`
          <table class="table">
            <thead>
              <tr>
                <th>用户ID</th>
                <th>名称</th>
                <th>备注数</th>
                <th>首次见面</th>
                <th>最近活跃</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => html`
                <tr>
                  <td>
                    <code style="font-size: 0.75rem;">${user.userId.substring(0, 16)}...</code>
                  </td>
                  <td>${user.name || '-'}</td>
                  <td>
                    <span class="badge badge-info">${user.notes?.length ?? 0}</span>
                  </td>
                  <td style="font-size: 0.875rem; color: var(--color-text-secondary);">
                    ${formatDate(user.firstSeen)}
                  </td>
                  <td style="font-size: 0.875rem; color: var(--color-text-secondary);">
                    ${formatDate(user.lastSeen)}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `
      }
    </div>

    ${users.length > 0 ? html`
      <div class="card" style="margin-top: var(--spacing-lg);">
        <div class="card-header">
          <h3 class="card-title">📝 最近记忆详情</h3>
        </div>
        ${users.slice(0, 3).map(user => html`
          <div style="margin-bottom: var(--spacing-lg); padding-bottom: var(--spacing-lg); border-bottom: 1px solid var(--color-border);">
            <div style="font-weight: 600; margin-bottom: var(--spacing-sm);">
              用户: ${user.userId.substring(0, 20)}...
            </div>
            ${user.notes && user.notes.length > 0
              ? html`
                <ul style="margin: 0; padding-left: var(--spacing-lg); color: var(--color-text-secondary);">
                  ${user.notes.slice(-5).map(note => html`
                    <li style="margin-bottom: var(--spacing-xs); font-size: 0.875rem;">${note}</li>
                  `)}
                </ul>
              `
              : html`<div style="color: var(--color-text-muted); font-size: 0.875rem;">暂无备注</div>`
            }
          </div>
        `)}
      </div>
    ` : ''}
  `;
}
