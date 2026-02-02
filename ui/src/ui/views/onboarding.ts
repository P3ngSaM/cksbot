/**
 * Onboarding View - 极简配置向导
 * 设计理念：一屏显示，渐进式展示，Apple 风格
 */

import { html } from 'lit';

// Lucide Icons (SVG only, no emojis)
const icons = {
  cpu: html`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
  smartphone: html`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  sparkles: html`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
  check: html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  arrowRight: html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowLeft: html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  upload: html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  image: html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  info: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
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
  onAvatarUpload: (file: File) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function renderOnboarding(props: OnboardingProps) {
  const steps = ['welcome', 'model', 'feishu', 'profile', 'complete'];
  const currentIndex = steps.indexOf(props.step);

  return html`
    <div class="onboarding-container">
      ${props.step !== 'welcome' && props.step !== 'complete' ? renderProgressIndicator(currentIndex, steps.length) : ''}
      ${renderStep(props)}
    </div>

    <style>
      /* Google Fonts - Inter */
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

      .onboarding-container {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #FFFFFF;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow: hidden;
        position: relative;
      }

      /* Progress Indicator */
      .progress-indicator {
        position: absolute;
        top: 32px;
        display: flex;
        gap: 8px;
        z-index: 10;
      }

      .progress-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(23, 23, 23, 0.15);
        transition: all 250ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      .progress-dot.active {
        width: 32px;
        border-radius: 4px;
        background: #171717;
      }

      /* Step Container */
      .step-container {
        width: 100%;
        max-width: 520px;
        padding: 0 24px;
        animation: fadeSlideIn 400ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      @keyframes fadeSlideIn {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Typography */
      .step-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        margin: 0 auto 24px;
        color: #171717;
      }

      .step-title {
        font-size: 36px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: #171717;
        text-align: center;
        margin: 0 0 12px 0;
      }

      .step-subtitle {
        font-size: 17px;
        font-weight: 400;
        color: #404040;
        text-align: center;
        margin: 0 0 48px 0;
        line-height: 1.5;
      }

      /* Form Elements */
      .form-group {
        margin-bottom: 20px;
      }

      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #171717;
        margin-bottom: 8px;
      }

      .form-input {
        width: 100%;
        padding: 14px 16px;
        font-size: 16px;
        font-family: inherit;
        color: #171717;
        background: #FAFAFA;
        border: 1.5px solid transparent;
        border-radius: 10px;
        outline: none;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
        box-sizing: border-box;
      }

      .form-input:focus {
        background: #FFFFFF;
        border-color: #171717;
      }

      .form-input::placeholder {
        color: #A0A0A0;
      }

      .form-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
        font-size: 13px;
        color: #737373;
      }

      /* Provider Selection */
      .provider-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }

      .provider-card {
        padding: 20px 12px;
        background: #FAFAFA;
        border: 2px solid transparent;
        border-radius: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
        position: relative;
      }

      .provider-card:hover {
        background: #F5F5F5;
        border-color: #E5E5E5;
      }

      .provider-card.selected {
        background: #FFFFFF;
        border-color: #171717;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .provider-card.selected::after {
        content: '';
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        background: #171717;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .provider-card.selected::before {
        content: '✓';
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        color: #FFFFFF;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }

      .provider-name {
        font-size: 15px;
        font-weight: 600;
        color: #171717;
        margin-top: 8px;
      }

      .provider-desc {
        font-size: 12px;
        color: #737373;
        margin-top: 4px;
      }

      /* Mode Selection */
      .mode-grid {
        display: grid;
        gap: 12px;
        margin-bottom: 24px;
      }

      .mode-card {
        padding: 18px 20px;
        background: #FAFAFA;
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .mode-card:hover {
        background: #F5F5F5;
        border-color: #E5E5E5;
      }

      .mode-card.selected {
        background: #FFFFFF;
        border-color: #171717;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .mode-radio {
        width: 20px;
        height: 20px;
        border: 2px solid #D4D4D4;
        border-radius: 50%;
        flex-shrink: 0;
        position: relative;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
        margin-top: 2px;
      }

      .mode-card.selected .mode-radio {
        border-color: #171717;
        background: #171717;
      }

      .mode-card.selected .mode-radio::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background: #FFFFFF;
        border-radius: 50%;
      }

      .mode-content {
        flex: 1;
      }

      .mode-title {
        font-size: 15px;
        font-weight: 600;
        color: #171717;
        margin-bottom: 4px;
      }

      .mode-desc {
        font-size: 13px;
        color: #737373;
        line-height: 1.4;
      }

      .mode-badge {
        display: inline-block;
        padding: 2px 8px;
        background: #D4AF37;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 600;
        border-radius: 4px;
        margin-left: 8px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      /* Avatar Upload */
      .avatar-section {
        text-align: center;
        margin-bottom: 32px;
      }

      .avatar-upload {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 20px;
      }

      .avatar-preview {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: #FAFAFA;
        border: 3px solid #E5E5E5;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      .avatar-preview:hover {
        border-color: #171717;
        transform: scale(1.02);
      }

      .avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        color: #A0A0A0;
      }

      .avatar-upload-overlay {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 36px;
        height: 36px;
        background: #171717;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      .avatar-upload-overlay:hover {
        background: #404040;
        transform: scale(1.1);
      }

      .avatar-upload input[type="file"] {
        display: none;
      }

      .avatar-hint {
        font-size: 13px;
        color: #737373;
      }

      /* Buttons */
      .button-group {
        display: flex;
        gap: 12px;
        margin-top: 40px;
      }

      .btn {
        flex: 1;
        padding: 14px 24px;
        font-size: 16px;
        font-weight: 600;
        font-family: inherit;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.25, 0.1, 0.25, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        outline: none;
      }

      .btn-primary {
        background: #171717;
        color: #FFFFFF;
      }

      .btn-primary:hover {
        background: #404040;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .btn-primary:active {
        transform: translateY(0);
      }

      .btn-secondary {
        background: #FAFAFA;
        color: #171717;
        border: 1.5px solid #E5E5E5;
      }

      .btn-secondary:hover {
        background: #F5F5F5;
        border-color: #D4D4D4;
      }

      .btn-text {
        background: transparent;
        color: #737373;
        flex: 0;
        padding: 14px 20px;
      }

      .btn-text:hover {
        color: #171717;
        background: #FAFAFA;
      }

      .btn-large {
        padding: 18px 32px;
        font-size: 17px;
      }

      /* Welcome Screen */
      .welcome-container {
        text-align: center;
      }

      .welcome-logo {
        width: 120px;
        height: 120px;
        margin: 0 auto 32px;
        border-radius: 24px;
        overflow: hidden;
      }

      .welcome-logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .welcome-title {
        font-size: 48px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #171717;
        margin: 0 0 16px 0;
      }

      .welcome-subtitle {
        font-size: 19px;
        color: #404040;
        margin: 0 0 48px 0;
        line-height: 1.5;
      }

      /* Complete Screen */
      .complete-container {
        text-align: center;
      }

      .complete-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 32px;
        background: #171717;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        animation: scaleIn 400ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      @keyframes scaleIn {
        from {
          transform: scale(0);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      .complete-title {
        font-size: 42px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #171717;
        margin: 0 0 12px 0;
      }

      .complete-subtitle {
        font-size: 17px;
        color: #404040;
        margin: 0 0 48px 0;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .step-container {
          max-width: 100%;
          padding: 0 20px;
        }

        .step-title {
          font-size: 28px;
        }

        .welcome-title {
          font-size: 36px;
        }

        .complete-title {
          font-size: 32px;
        }

        .provider-grid {
          grid-template-columns: 1fr;
        }
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
    </style>
  `;
}

function renderProgressIndicator(current: number, total: number) {
  const dots = [];
  for (let i = 1; i < total - 1; i++) {
    dots.push(html`<div class="progress-dot ${i === current ? 'active' : ''}"></div>`);
  }
  return html`<div class="progress-indicator">${dots}</div>`;
}

function renderStep(props: OnboardingProps) {
  switch (props.step) {
    case 'welcome':
      return renderWelcome(props);
    case 'model':
      return renderModel(props);
    case 'feishu':
      return renderFeishu(props);
    case 'profile':
      return renderProfile(props);
    case 'complete':
      return renderComplete(props);
    default:
      return html``;
  }
}

function renderWelcome(props: OnboardingProps) {
  return html`
    <div class="step-container welcome-container">
      <div class="welcome-logo">
        <img src="/cks-logo.png" alt="CKS Bot" />
      </div>
      <h1 class="welcome-title">CKS Bot</h1>
      <p class="welcome-subtitle">AI 语音助手，让工作更高效</p>
      <button class="btn btn-primary btn-large" @click=${props.onNext}>
        开始配置
        ${icons.arrowRight}
      </button>
    </div>
  `;
}

function renderModel(props: OnboardingProps) {
  const providers = [
    { id: 'minimax', name: 'MiniMax', desc: '推荐·中文优化' },
    { id: 'anthropic', name: 'Anthropic', desc: 'Claude 系列' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT 系列' },
  ];

  return html`
    <div class="step-container">
      <div class="step-icon">${icons.cpu}</div>
      <h2 class="step-title">选择 AI 模型</h2>
      <p class="step-subtitle">配置您的 AI 服务提供商</p>

      <div class="provider-grid">
        ${providers.map(p => html`
          <div
            class="provider-card ${props.modelProvider === p.id ? 'selected' : ''}"
            @click=${() => props.onModelProviderChange(p.id)}
          >
            <div class="provider-name">${p.name}</div>
            <div class="provider-desc">${p.desc}</div>
          </div>
        `)}
      </div>

      <div class="form-group">
        <label class="form-label" for="model-name">模型名称</label>
        <input
          id="model-name"
          type="text"
          class="form-input"
          placeholder="例如: MiniMax-M2.1"
          .value=${props.modelName}
          @input=${(e: Event) => props.onModelNameChange((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="api-key">API Key</label>
        <input
          id="api-key"
          type="password"
          class="form-input"
          placeholder="sk-..."
          .value=${props.apiKey}
          @input=${(e: Event) => props.onApiKeyChange((e.target as HTMLInputElement).value)}
        />
        <div class="form-hint">
          ${icons.info}
          <span>您的 API 密钥将安全存储在本地</span>
        </div>
      </div>

      ${props.modelProvider !== 'minimax' ? html`
        <div class="form-group">
          <label class="form-label" for="base-url">API Base URL</label>
          <input
            id="base-url"
            type="text"
            class="form-input"
            placeholder="https://api.example.com"
            .value=${props.baseUrl}
            @input=${(e: Event) => props.onBaseUrlChange((e.target as HTMLInputElement).value)}
          />
        </div>
      ` : ''}

      <div class="button-group">
        <button class="btn btn-text" @click=${props.onSkip}>跳过</button>
        <button class="btn btn-primary" @click=${props.onNext}>
          下一步
          ${icons.arrowRight}
        </button>
      </div>
    </div>
  `;
}

function renderFeishu(props: OnboardingProps) {
  return html`
    <div class="step-container">
      <div class="step-icon">${icons.smartphone}</div>
      <h2 class="step-title">连接飞书</h2>
      <p class="step-subtitle">配置飞书机器人</p>

      <div class="form-group">
        <label class="form-label" for="app-id">App ID</label>
        <input
          id="app-id"
          type="text"
          class="form-input"
          placeholder="cli_..."
          .value=${props.feishuAppId}
          @input=${(e: Event) => props.onFeishuAppIdChange((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="app-secret">App Secret</label>
        <input
          id="app-secret"
          type="password"
          class="form-input"
          placeholder="••••••••"
          .value=${props.feishuAppSecret}
          @input=${(e: Event) => props.onFeishuAppSecretChange((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="form-group">
        <label class="form-label">连接模式</label>
        <div class="mode-grid">
          <div
            class="mode-card ${props.feishuMode === 'websocket' ? 'selected' : ''}"
            @click=${() => props.onFeishuModeChange('websocket')}
          >
            <div class="mode-radio"></div>
            <div class="mode-content">
              <div class="mode-title">
                WebSocket 长连接
                <span class="mode-badge">推荐</span>
              </div>
              <div class="mode-desc">无需公网 IP，更加实时</div>
            </div>
          </div>
          <div
            class="mode-card ${props.feishuMode === 'webhook' ? 'selected' : ''}"
            @click=${() => props.onFeishuModeChange('webhook')}
          >
            <div class="mode-radio"></div>
            <div class="mode-content">
              <div class="mode-title">Webhook 回调</div>
              <div class="mode-desc">需要配置公网可访问的 URL</div>
            </div>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button class="btn btn-secondary" @click=${props.onBack}>
          ${icons.arrowLeft}
          返回
        </button>
        <button class="btn btn-text" @click=${props.onSkip}>跳过</button>
        <button class="btn btn-primary" @click=${props.onNext}>
          下一步
          ${icons.arrowRight}
        </button>
      </div>
    </div>
  `;
}

function renderProfile(props: OnboardingProps) {
  const handleAvatarClick = () => {
    const input = document.getElementById('avatar-upload') as HTMLInputElement;
    input?.click();
  };

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && props.onAvatarUpload) {
      props.onAvatarUpload(file);
    }
  };

  return html`
    <div class="step-container">
      <div class="step-icon">${icons.sparkles}</div>
      <h2 class="step-title">个性化助手</h2>
      <p class="step-subtitle">自定义您的 AI 助手</p>

      <div class="avatar-section">
        <div class="avatar-upload">
          <div class="avatar-preview" @click=${handleAvatarClick}>
            ${props.botAvatar && props.botAvatar.startsWith('data:') ? html`
              <img src=${props.botAvatar} alt="Avatar" />
            ` : html`
              <img src="/cks-logo.png" alt="CKS Bot" />
            `}
          </div>
          <div class="avatar-upload-overlay" @click=${handleAvatarClick}>
            ${icons.upload}
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            @change=${handleFileChange}
          />
        </div>
        <div class="avatar-hint">点击上传头像 (可选)</div>
      </div>

      <div class="form-group">
        <label class="form-label" for="bot-name">助手名称</label>
        <input
          id="bot-name"
          type="text"
          class="form-input"
          placeholder="例如: 小助手、Pilot"
          .value=${props.botName}
          @input=${(e: Event) => props.onBotNameChange((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="button-group">
        <button class="btn btn-secondary" @click=${props.onBack}>
          ${icons.arrowLeft}
          返回
        </button>
        <button class="btn btn-primary" @click=${props.onNext}>
          完成
          ${icons.check}
        </button>
      </div>
    </div>
  `;
}

function renderComplete(props: OnboardingProps) {
  return html`
    <div class="step-container complete-container">
      <div class="complete-icon">${icons.check}</div>
      <h1 class="complete-title">配置完成</h1>
      <p class="complete-subtitle">您的 CKS Bot 已准备就绪</p>
      <button class="btn btn-primary btn-large" @click=${props.onComplete}>
        进入控制台
        ${icons.arrowRight}
      </button>
    </div>
  `;
}
