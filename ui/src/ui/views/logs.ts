/**
 * Logs View - 日志视图
 */

import { html } from 'lit';

interface LogsProps {
  logs: string[];
}

export function renderLogs(props: LogsProps) {
  const { logs } = props;

  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📜 系统日志</h3>
        <div style="display: flex; gap: var(--spacing-sm);">
          <select class="input" style="width: auto;">
            <option value="all">全部级别</option>
            <option value="debug">DEBUG</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>
          <button class="btn btn-secondary btn-sm">
            🔄 刷新
          </button>
          <button class="btn btn-secondary btn-sm">
            📋 复制
          </button>
        </div>
      </div>

      <div style="
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        height: 500px;
        overflow-y: auto;
      ">
        ${logs.length === 0
          ? html`
            <div style="color: #6a9955;">// 日志将在此显示...</div>
            <div style="color: #6a9955;">// 请确保网关正在运行</div>
          `
          : logs.map(log => {
              const level = log.includes('ERROR') ? '#f14c4c' :
                           log.includes('WARN') ? '#cca700' :
                           log.includes('INFO') ? '#3dc9b0' :
                           log.includes('DEBUG') ? '#569cd6' : '#d4d4d4';
              return html`<div style="color: ${level}; margin-bottom: 2px;">${log}</div>`;
            })
        }
      </div>
    </div>

    <div class="card" style="margin-top: var(--spacing-lg);">
      <div class="card-header">
        <h3 class="card-title">🔍 日志说明</h3>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-md);">
        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
          <span style="color: #569cd6;">●</span>
          <span>DEBUG - 调试信息</span>
        </div>
        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
          <span style="color: #3dc9b0;">●</span>
          <span>INFO - 正常信息</span>
        </div>
        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
          <span style="color: #cca700;">●</span>
          <span>WARN - 警告</span>
        </div>
        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
          <span style="color: #f14c4c;">●</span>
          <span>ERROR - 错误</span>
        </div>
      </div>
    </div>
  `;
}
