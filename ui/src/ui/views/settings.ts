/**
 * Settings View - 设置视图
 */

import { html } from 'lit';

interface SettingsProps {
  onRestartOnboarding?: () => void;
}

export function renderSettings(props: SettingsProps) {
  return html`
    <div class="grid-2">
      <!-- 模型配置 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🤖 模型配置</h3>
        </div>
        <div class="form-group">
          <label class="form-label">模型</label>
          <select class="input">
            <option value="MiniMax-M2.1">MiniMax-M2.1</option>
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            <option value="claude-opus-4-5-20251101">Claude Opus 4.5</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input type="password" class="input" placeholder="sk-..." />
          <div class="form-hint">模型 API 密钥</div>
        </div>
        <div class="form-group">
          <label class="form-label">Base URL</label>
          <input type="text" class="input" placeholder="https://api.minimaxi.com/anthropic" />
          <div class="form-hint">API 端点地址</div>
        </div>
        <div class="form-group">
          <label class="form-label">Max Tokens</label>
          <input type="number" class="input" value="8192" />
        </div>
        <button class="btn btn-primary">💾 保存</button>
      </div>

      <!-- 飞书配置 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📱 飞书配置</h3>
        </div>
        <div class="form-group">
          <label class="form-label">App ID</label>
          <input type="text" class="input" placeholder="cli_xxx" />
        </div>
        <div class="form-group">
          <label class="form-label">App Secret</label>
          <input type="password" class="input" placeholder="xxx" />
        </div>
        <div class="form-group">
          <label class="form-label">连接模式</label>
          <select class="input">
            <option value="websocket">WebSocket 长连接</option>
            <option value="webhook">Webhook 回调</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="display: flex; align-items: center; gap: var(--spacing-sm);">
            <input type="checkbox" checked />
            <span>群聊需要 @机器人</span>
          </label>
        </div>
        <button class="btn btn-primary">💾 保存</button>
      </div>
    </div>

    <div class="card" style="margin-top: var(--spacing-lg);">
      <div class="card-header">
        <h3 class="card-title">🖥️ 网关配置</h3>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">端口</label>
          <input type="number" class="input" value="18789" />
        </div>
        <div class="form-group">
          <label class="form-label">主机</label>
          <input type="text" class="input" value="127.0.0.1" />
        </div>
      </div>
      <button class="btn btn-primary">💾 保存</button>
    </div>

    <div class="card" style="margin-top: var(--spacing-lg);">
      <div class="card-header">
        <h3 class="card-title">⚙️ 系统操作</h3>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); background: var(--bg-secondary); border-radius: var(--radius-md);">
          <div>
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">重新配置向导</div>
            <div style="font-size: 14px; color: var(--text-secondary);">返回配置向导重新设置所有参数</div>
          </div>
          <button class="btn btn-primary" @click=${props.onRestartOnboarding}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            重新配置
          </button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: var(--spacing-lg);">
      <div class="card-header">
        <h3 class="card-title">⚠️ 危险操作</h3>
      </div>
      <div style="display: flex; gap: var(--spacing-md);">
        <button class="btn btn-danger">🗑️ 清除所有记忆</button>
        <button class="btn btn-danger">🗑️ 清除所有定时任务</button>
        <button class="btn btn-secondary">🔄 重启网关</button>
      </div>
    </div>
  `;
}
