/**
 * Onboarding View - 首次启动引导
 * 使用 Lucide SVG 图标
 */

import { html } from 'lit';

// Lucide Icons
const icons = {
  bot: html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
  monitor: html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
  clock: html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  brain: html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>`,
  cpu: html`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
  smartphone: html`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  sparkles: html`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>`,
  partyPopper: html`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.63-.69 1.05-1.28.99h0c-.78-.08-1.37.69-1.08 1.42l.36.86"/><path d="m21 17.23c0 1.02-.5 1.68-1.22 1.98l-.78.31"/><path d="M10 5.18L9.82 5.8a2.24 2.24 0 0 1-2.11 1.7h-.38a2 2 0 0 0-1.76 2.94l.22.43"/><path d="m10 10 .67.2c1.14.34 1.99 1.35 2.11 2.53l.04.36c.03.28.1.55.24.79l.57.98"/></svg>`,
  check: html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  arrowRight: html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowLeft: html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  externalLink: html`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
};

export type OnboardingStep = 'welcome' | 'model' | 'feishu' | 'profile' | 'complete';

export interface OnboardingProps {
  step: OnboardingStep;
  // Model config
  modelProvider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  // Feishu config
  feishuAppId: string;
  feishuAppSecret: string;
  feishuMode: 'websocket' | 'webhook';
  // Profile
  botName: string;
  botAvatar: string;
  // Callbacks
  onModelProviderChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onFeishuAppIdChange: (value: string) => void;
  onFeishuAppSecretChange: (value: string) => void;
  onFeishuModeChange: (value: 'websocket' | 'webhook') => void;
  onBotNameChange: (value: string) => void;
  onBotAvatarChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function renderOnboarding(props: OnboardingProps) {
  const steps: OnboardingStep[] = ['welcome', 'model', 'feishu', 'profile', 'complete'];
  const currentIndex = steps.indexOf(props.step);

  return html`
    <div class="onboarding-container">
      <div class="onboarding-content">
        ${props.step === 'welcome' ? renderWelcome(props) : ''}
        ${props.step === 'model' ? renderModelConfig(props) : ''}
        ${props.step === 'feishu' ? renderFeishuConfig(props) : ''}
        ${props.step === 'profile' ? renderProfile(props) : ''}
        ${props.step === 'complete' ? renderComplete(props) : ''}
      </div>

      <!-- Progress dots -->
      <div class="onboarding-progress">
        ${steps.map((s, i) => html`
          <div class="progress-dot ${i <= currentIndex ? 'active' : ''} ${i === currentIndex ? 'current' : ''}"></div>
        `)}
      </div>
    </div>
  `;
}

function renderWelcome(props: OnboardingProps) {
  return html`
    <div class="onboarding-step animate-rise">
      <div class="onboarding-logo">
        <svg viewBox="0 0 100 100" width="120" height="120">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#6366F1" />
              <stop offset="100%" style="stop-color:#8B5CF6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#logoGrad)"/>
          <text x="50" y="68" font-family="Arial" font-size="50" font-weight="bold" fill="white" text-anchor="middle">F</text>
        </svg>
      </div>
      <h1 class="onboarding-title">欢迎使用 FeishuPilot</h1>
      <p class="onboarding-subtitle">
        您的飞书智能助手，让 AI 帮您完成更多任务
      </p>
      <div class="onboarding-features">
        <div class="feature-item">
          <span class="feature-icon">${icons.bot}</span>
          <span>智能对话 - 通过飞书与 AI 自然交流</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">${icons.monitor}</span>
          <span>电脑控制 - 自动化操作您的 Mac</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">${icons.clock}</span>
          <span>定时任务 - 设置定时提醒和自动消息</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">${icons.brain}</span>
          <span>记忆系统 - 记住您的偏好和信息</span>
        </div>
      </div>
      <div class="onboarding-actions">
        <button class="btn btn-primary btn-lg" @click=${props.onNext}>
          开始配置
          <span style="margin-left: 8px;">${icons.arrowRight}</span>
        </button>
      </div>
    </div>
  `;
}

function renderModelConfig(props: OnboardingProps) {
  return html`
    <div class="onboarding-step animate-rise">
      <div class="step-header">
        <span class="step-icon">${icons.cpu}</span>
        <h2 class="step-title">配置 AI 模型</h2>
        <p class="step-subtitle">选择您要使用的 AI 模型和 API 凭证</p>
      </div>

      <div class="config-form">
        <div class="form-group">
          <label class="form-label">模型提供商</label>
          <select
            class="input"
            .value=${props.modelProvider}
            @change=${(e: Event) => props.onModelProviderChange((e.target as HTMLSelectElement).value)}
          >
            <option value="minimax">MiniMax (推荐)</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">模型名称</label>
          <input
            type="text"
            class="input"
            placeholder="例如: MiniMax-M2.1"
            .value=${props.modelName}
            @input=${(e: Event) => props.onModelNameChange((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="form-group">
          <label class="form-label">API Key</label>
          <input
            type="password"
            class="input"
            placeholder="sk-..."
            .value=${props.apiKey}
            @input=${(e: Event) => props.onApiKeyChange((e.target as HTMLInputElement).value)}
          />
          <div class="form-hint">您的 API 密钥将安全存储在本地</div>
        </div>

        <div class="form-group">
          <label class="form-label">API Base URL (可选)</label>
          <input
            type="text"
            class="input"
            placeholder="https://api.minimaxi.com/anthropic"
            .value=${props.baseUrl}
            @input=${(e: Event) => props.onBaseUrlChange((e.target as HTMLInputElement).value)}
          />
          <div class="form-hint">如使用代理服务，请填写自定义端点</div>
        </div>
      </div>

      <div class="onboarding-actions">
        <button class="btn btn-secondary" @click=${props.onBack}>
          <span style="margin-right: 8px;">${icons.arrowLeft}</span>
          返回
        </button>
        <button class="btn btn-primary" @click=${props.onNext}>
          下一步
          <span style="margin-left: 8px;">${icons.arrowRight}</span>
        </button>
      </div>
    </div>
  `;
}

function renderFeishuConfig(props: OnboardingProps) {
  return html`
    <div class="onboarding-step animate-rise">
      <div class="step-header">
        <span class="step-icon">${icons.smartphone}</span>
        <h2 class="step-title">配置飞书应用</h2>
        <p class="step-subtitle">连接您的飞书机器人</p>
      </div>

      <div class="config-form">
        <div class="form-group">
          <label class="form-label">App ID</label>
          <input
            type="text"
            class="input"
            placeholder="cli_xxx"
            .value=${props.feishuAppId}
            @input=${(e: Event) => props.onFeishuAppIdChange((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="form-group">
          <label class="form-label">App Secret</label>
          <input
            type="password"
            class="input"
            placeholder="xxx"
            .value=${props.feishuAppSecret}
            @input=${(e: Event) => props.onFeishuAppSecretChange((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="form-group">
          <label class="form-label">连接模式</label>
          <div class="radio-group">
            <label class="radio-item ${props.feishuMode === 'websocket' ? 'active' : ''}">
              <input
                type="radio"
                name="feishuMode"
                value="websocket"
                ?checked=${props.feishuMode === 'websocket'}
                @change=${() => props.onFeishuModeChange('websocket')}
              />
              <span class="radio-label">
                <strong>WebSocket 长连接</strong>
                <small>推荐，无需公网 IP</small>
              </span>
            </label>
            <label class="radio-item ${props.feishuMode === 'webhook' ? 'active' : ''}">
              <input
                type="radio"
                name="feishuMode"
                value="webhook"
                ?checked=${props.feishuMode === 'webhook'}
                @change=${() => props.onFeishuModeChange('webhook')}
              />
              <span class="radio-label">
                <strong>Webhook 回调</strong>
                <small>需要公网可访问的 URL</small>
              </span>
            </label>
          </div>
        </div>

        <div class="callout info">
          <div class="callout-title">如何获取凭证？</div>
          <div class="callout-content">
            1. 登录 <a href="https://open.feishu.cn/app" target="_blank">飞书开放平台 ${icons.externalLink}</a><br/>
            2. 创建企业自建应用<br/>
            3. 添加机器人能力<br/>
            4. 复制 App ID 和 App Secret
          </div>
        </div>
      </div>

      <div class="onboarding-actions">
        <button class="btn btn-secondary" @click=${props.onBack}>
          <span style="margin-right: 8px;">${icons.arrowLeft}</span>
          返回
        </button>
        <button class="btn btn-link" @click=${props.onSkip}>跳过</button>
        <button class="btn btn-primary" @click=${props.onNext}>
          下一步
          <span style="margin-left: 8px;">${icons.arrowRight}</span>
        </button>
      </div>
    </div>
  `;
}

function renderProfile(props: OnboardingProps) {
  // Simple letter avatars instead of emoji
  const avatarOptions = ['F', 'P', 'A', 'X', 'K', 'M', 'Z', 'R'];

  return html`
    <div class="onboarding-step animate-rise">
      <div class="step-header">
        <span class="step-icon">${icons.sparkles}</span>
        <h2 class="step-title">个性化您的助手</h2>
        <p class="step-subtitle">给您的 AI 助手取个名字吧</p>
      </div>

      <div class="config-form">
        <div class="form-group">
          <label class="form-label">助手名称</label>
          <input
            type="text"
            class="input input-lg"
            placeholder="例如: 小飞、助手、Pilot"
            .value=${props.botName}
            @input=${(e: Event) => props.onBotNameChange((e.target as HTMLInputElement).value)}
          />
        </div>

        <div class="form-group">
          <label class="form-label">选择头像</label>
          <div class="avatar-picker">
            ${avatarOptions.map(avatar => html`
              <button
                class="avatar-option ${props.botAvatar === avatar ? 'selected' : ''}"
                @click=${() => props.onBotAvatarChange(avatar)}
              >
                ${avatar}
              </button>
            `)}
          </div>
        </div>

        <div class="preview-card">
          <div class="preview-avatar">${props.botAvatar || 'F'}</div>
          <div class="preview-info">
            <div class="preview-name">${props.botName || 'AI 助手'}</div>
            <div class="preview-status">
              <span class="status-indicator"></span>
              在线 · 准备就绪
            </div>
          </div>
        </div>
      </div>

      <div class="onboarding-actions">
        <button class="btn btn-secondary" @click=${props.onBack}>
          <span style="margin-right: 8px;">${icons.arrowLeft}</span>
          返回
        </button>
        <button class="btn btn-primary" @click=${props.onNext}>
          完成配置
          <span style="margin-left: 8px;">${icons.arrowRight}</span>
        </button>
      </div>
    </div>
  `;
}

function renderComplete(props: OnboardingProps) {
  return html`
    <div class="onboarding-step animate-rise">
      <div class="complete-icon">${icons.partyPopper}</div>
      <h1 class="onboarding-title">配置完成！</h1>
      <p class="onboarding-subtitle">
        您的 FeishuPilot 已准备就绪
      </p>

      <div class="complete-summary">
        <div class="summary-item">
          <span class="summary-icon">${icons.check}</span>
          <span>AI 模型已配置</span>
        </div>
        <div class="summary-item">
          <span class="summary-icon">${icons.check}</span>
          <span>飞书应用已连接</span>
        </div>
        <div class="summary-item">
          <span class="summary-icon">${icons.check}</span>
          <span>助手个性化完成</span>
        </div>
      </div>

      <div class="complete-tips">
        <h3>接下来您可以：</h3>
        <ul>
          <li>在飞书中 @机器人 开始对话</li>
          <li>尝试说 "帮我打开 Safari"</li>
          <li>设置定时任务，如 "每天早上9点提醒我"</li>
        </ul>
      </div>

      <div class="onboarding-actions">
        <button class="btn btn-primary btn-lg" @click=${props.onComplete}>
          进入控制台
          <span style="margin-left: 8px;">${icons.arrowRight}</span>
        </button>
      </div>
    </div>
  `;
}
