/**
 * Settings View - 设置视图
 */

import { html } from 'lit';

interface SettingsProps {}

export function renderSettings(_props: SettingsProps) {
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
