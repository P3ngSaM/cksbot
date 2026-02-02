/**
 * Chat View - 对话视图
 * Apple-style Design with Dynamic Identity
 */

import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/**
 * Simple markdown parser for chat messages
 * Supports: **bold**, *italic*, `code`, ```code blocks```, and line breaks
 */
function parseMarkdown(text: string): string {
  if (!text) return '';

  let result = text
    // Escape HTML to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (must be before inline code)
    .replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.08); padding: 10px 14px; border-radius: 10px; margin: 10px 0; overflow-x: auto; font-family: ui-monospace, SF Mono, Menlo, Monaco, monospace; font-size: 13px; line-height: 1.5; border: 1px solid rgba(0,0,0,0.06);">$1</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.08); padding: 3px 6px; border-radius: 5px; font-family: ui-monospace, SF Mono, Menlo, Monaco, monospace; font-size: 13px; border: 1px solid rgba(0,0,0,0.06);">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>');

  return result;
}

// SVG Icons
const icons = {
  send: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
  sparkles: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
  message: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  user: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  wand: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>`,
  mic: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  micOff: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  speaker: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  phone: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  phoneOff: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>`,
  plus: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
};

// 对话摘要类型
interface ConversationSummary {
  sessionId: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatProps {
  messages: Array<{ role: string; content: string }>;
  input: string;
  loading: boolean;
  assistantName: string;
  assistantAvatar: string;
  userName?: string;
  isFirstMessage?: boolean;
  isRecording?: boolean;
  voiceEnabled?: boolean;
  isRealtimeVoice?: boolean;
  realtimeStatus?: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening';
  realtimeTranscript?: string;
  // 对话历史相关
  conversations?: ConversationSummary[];
  currentSessionId?: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onInterrupt?: () => void;
  onVoiceToggle?: () => void;
  onSpeakMessage?: (text: string) => void;
  onRealtimeVoiceToggle?: () => void;
  // 对话历史操作
  onNewConversation?: () => void;
  onSelectConversation?: (sessionId: string) => void;
  onDeleteConversation?: (sessionId: string) => void;
}

export function renderChat(props: ChatProps) {
  const {
    messages,
    input,
    loading,
    assistantName,
    assistantAvatar,
    userName,
    isFirstMessage = false,
    isRecording = false,
    voiceEnabled = false,
    isRealtimeVoice = false,
    realtimeStatus = 'disconnected',
    realtimeTranscript = '',
    conversations = [],
    currentSessionId,
    onInputChange,
    onSend,
    onInterrupt,
    onVoiceToggle,
    onSpeakMessage,
    onRealtimeVoiceToggle,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation,
  } = props;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Welcome message for first-time users
  const renderWelcome = () => html`
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      max-width: 480px;
      margin: 0 auto;
    ">
      <div style="
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 28px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0, 122, 255, 0.25);
        margin-bottom: 20px;
      ">${assistantAvatar}</div>

      <h2 style="
        font-size: 24px;
        font-weight: 700;
        color: #1D1D1F;
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
      ">你好${userName ? `，${userName}` : ''}！</h2>

      <p style="
        font-size: 15px;
        color: #86868B;
        margin: 0 0 32px 0;
        line-height: 1.5;
      ">
        我是 <strong style="color: #1D1D1F;">${assistantName}</strong>，你的飞书智能助手。
        ${isFirstMessage ? '我们还不熟悉，不如先互相介绍一下？你可以告诉我你的名字，以及给我取一个你喜欢的名字。' : '有什么可以帮你的吗？'}
      </p>

      <div style="
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-width: 300px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(0, 122, 255, 0.1);
          border-radius: 12px;
          color: #007AFF;
          font-size: 13px;
        ">
          <span style="flex-shrink: 0; width: 18px; height: 18px;">${icons.sparkles}</span>
          <span>智能对话，理解你的意图</span>
        </div>
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(52, 199, 89, 0.12);
          border-radius: 12px;
          color: #34C759;
          font-size: 13px;
        ">
          <span style="flex-shrink: 0; width: 18px; height: 18px;">${icons.wand}</span>
          <span>自动执行飞书操作</span>
        </div>
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 149, 0, 0.12);
          border-radius: 12px;
          color: #FF9500;
          font-size: 13px;
        ">
          <span style="flex-shrink: 0; width: 18px; height: 18px;">${icons.message}</span>
          <span>记住你的偏好和习惯</span>
        </div>
      </div>

      ${isFirstMessage ? html`
        <div style="
          margin-top: 24px;
          padding: 12px 16px;
          background: #F5F5F7;
          border-radius: 12px;
          font-size: 13px;
          color: #86868B;
        ">
          <strong style="color: #1D1D1F;">提示：</strong>试着说 "你好，我叫小明，以后就叫你小飞吧"
        </div>
      ` : ''}
    </div>
  `;

  // 格式化时间为相对时间
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 渲染对话历史列表
  const renderConversationList = () => html`
    <div class="conversation-list" style="
      width: 280px;
      border-right: 1px solid rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      background: rgba(255,255,255,0.5);
    ">
      <div style="
        padding: 16px;
        border-bottom: 1px solid rgba(0,0,0,0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <span style="font-weight: 600; font-size: 15px;">对话历史</span>
        ${onNewConversation ? html`
          <button
            @click=${onNewConversation}
            class="btn-new-conversation"
            style="
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 6px 12px;
              border: none;
              background: #007AFF;
              color: white;
              border-radius: 9999px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 500;
              transition: all 150ms cubic-bezier(0.25, 0.1, 0.25, 1);
            "
            title="新对话"
          >
            <span style="width: 14px; height: 14px;">${icons.plus}</span>
            新对话
          </button>
        ` : ''}
      </div>
      <div style="
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      ">
        ${conversations.length === 0 ? html`
          <div style="
            text-align: center;
            padding: 32px 16px;
            color: #86868B;
            font-size: 13px;
          ">
            暂无对话记录
          </div>
        ` : conversations.map(conv => html`
          <div
            class="conversation-item ${conv.sessionId === currentSessionId ? 'active' : ''}"
            @click=${() => onSelectConversation?.(conv.sessionId)}
            style="
              padding: 12px;
              border-radius: 10px;
              cursor: pointer;
              margin-bottom: 4px;
              transition: all 0.2s ease;
              background: ${conv.sessionId === currentSessionId ? 'rgba(0, 122, 255, 0.1)' : 'transparent'};
              border: 1px solid ${conv.sessionId === currentSessionId ? 'rgba(0, 122, 255, 0.2)' : 'transparent'};
            "
          >
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 4px;
            ">
              <span style="
                font-weight: 500;
                font-size: 14px;
                color: #1D1D1F;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
              ">${conv.title}</span>
              ${onDeleteConversation ? html`
                <button
                  @click=${(e: Event) => { e.stopPropagation(); onDeleteConversation(conv.sessionId); }}
                  style="
                    padding: 4px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    opacity: 0.4;
                    transition: opacity 0.2s;
                  "
                  title="删除对话"
                >
                  <span style="width: 14px; height: 14px; color: #FF3B30;">${icons.trash}</span>
                </button>
              ` : ''}
            </div>
            <div style="
              font-size: 12px;
              color: #86868B;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              margin-bottom: 4px;
            ">${conv.preview}</div>
            <div style="
              font-size: 11px;
              color: #AEAEB2;
              display: flex;
              justify-content: space-between;
            ">
              <span>${conv.messageCount} 条消息</span>
              <span>${formatRelativeTime(conv.updatedAt)}</span>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;

  return html`
    <style>
      /* Apple-style scrollbar for chat */
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
      /* Firefox scrollbar */
      .chat-messages {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
      }

      /* Conversation item - Apple style interactions */
      .conversation-item {
        transition: all 150ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      .conversation-item:hover {
        background: rgba(0, 0, 0, 0.04) !important;
        transform: translateX(2px);  /* 微妙右移 */
      }

      .conversation-item.active {
        background: rgba(0, 122, 255, 0.1) !important;
        border-left: 3px solid #007AFF !important;  /* 左侧蓝色强调 */
        padding-left: 9px !important;  /* 补偿边框 */
      }

      .conversation-item.active:hover {
        background: rgba(0, 122, 255, 0.15) !important;
      }

      .conversation-item:hover button {
        opacity: 1 !important;
      }

      .conversation-item:active {
        transform: scale(0.98);  /* 按下效果 */
      }

      /* 新对话按钮 - Apple 风格 */
      .btn-new-conversation:hover {
        background: #0051D5;
        transform: scale(1.01);
        box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
      }

      .btn-new-conversation:active {
        transform: scale(0.98);
      }

      /* 聊天消息气泡 - Apple iMessage 风格 */
      .chat-message {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        animation: messageSlideIn 250ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      @keyframes messageSlideIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .chat-message.user {
        flex-direction: row-reverse;
      }

      .chat-bubble {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 15px;
        line-height: 1.47;
        word-wrap: break-word;
        position: relative;
      }

      /* AI 消息气泡 - 浅灰背景 + 轻微阴影 */
      .chat-message.assistant .chat-bubble {
        background: rgba(0, 0, 0, 0.06);
        color: #1D1D1F;
        border-bottom-left-radius: 6px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }

      /* 用户消息气泡 - 蓝色渐变 */
      .chat-message.user .chat-bubble {
        background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
        color: #FFFFFF;
        border-bottom-right-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
      }

      /* AI 名称标签 */
      .chat-bubble-header {
        font-size: 11px;
        color: #86868B;
        margin-bottom: 4px;
        font-weight: 500;
        letter-spacing: 0.01em;
      }

      /* 朗读按钮优化 */
      .btn-speak {
        margin-top: 8px;
        padding: 4px 10px;
        border: none;
        background: rgba(0, 122, 255, 0.08);
        border-radius: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #007AFF;
        font-size: 12px;
        font-weight: 500;
        transition: all 150ms cubic-bezier(0.25, 0.1, 0.25, 1);
      }

      .btn-speak:hover {
        background: rgba(0, 122, 255, 0.12);
        transform: scale(1.02);
      }

      .btn-speak:active {
        transform: scale(0.98);
      }
    </style>
    <div style="display: flex; height: calc(100vh - 160px);">
      ${conversations.length > 0 || onNewConversation ? renderConversationList() : ''}
      <div class="chat-container" style="flex: 1;">
        <div class="chat-messages">
          ${messages.length === 0
            ? renderWelcome()
          : messages.map(msg => html`
            <div class="chat-message ${msg.role}">
              <div class="chat-avatar" style="${msg.role === 'assistant' ? 'background: linear-gradient(135deg, var(--accent) 0%, #5856D6 100%);' : ''}">
                ${msg.role === 'user'
                  ? (userName ? userName.charAt(0).toUpperCase() : html`<span style="width: 18px; height: 18px;">${icons.user}</span>`)
                  : assistantAvatar}
              </div>
              <div class="chat-bubble">
                ${msg.role === 'assistant' ? html`
                  <div class="chat-bubble-header">
                    ${assistantName}
                  </div>
                ` : ''}
                ${msg.content
                  ? html`<div>${unsafeHTML(parseMarkdown(msg.content))}</div>`
                  : msg.role === 'assistant'
                    ? html`<div class="typing-indicator" style="display: flex; gap: 4px; padding: 4px 0;">
                        <span style="width: 6px; height: 6px; background: #86868B; border-radius: 50%; animation: typing 1.4s infinite ease-in-out; animation-delay: 0s;"></span>
                        <span style="width: 6px; height: 6px; background: #86868B; border-radius: 50%; animation: typing 1.4s infinite ease-in-out; animation-delay: 0.2s;"></span>
                        <span style="width: 6px; height: 6px; background: #86868B; border-radius: 50%; animation: typing 1.4s infinite ease-in-out; animation-delay: 0.4s;"></span>
                      </div>
                      <style>
                        @keyframes typing {
                          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                          30% { transform: translateY(-4px); opacity: 1; }
                        }
                      </style>`
                    : ''
                }
                ${msg.role === 'assistant' && msg.content && onSpeakMessage ? html`
                  <button
                    class="btn-speak"
                    @click=${() => onSpeakMessage(msg.content)}
                    title="朗读此消息"
                  >
                    <span style="width: 14px; height: 14px;">${icons.speaker}</span>
                    朗读
                  </button>
                ` : ''}
              </div>
            </div>
          `)
        }
      </div>
      <div class="chat-input-container">
        ${onRealtimeVoiceToggle ? html`
          <button
            class="btn ${isRealtimeVoice ? 'btn-danger' : 'btn-secondary'}"
            @click=${onRealtimeVoiceToggle}
            ?disabled=${loading}
            style="padding: 10px 12px; ${isRealtimeVoice ? 'animation: pulse 1.5s infinite;' : ''}"
            title="${isRealtimeVoice ? '结束实时通话' : '实时语音通话'}"
          >
            <span style="width: 18px; height: 18px;">${isRealtimeVoice ? icons.phoneOff : icons.phone}</span>
          </button>
        ` : ''}
        ${onVoiceToggle ? html`
          <button
            class="btn ${isRecording ? 'btn-danger' : 'btn-secondary'}"
            @click=${onVoiceToggle}
            ?disabled=${loading || isRealtimeVoice}
            style="padding: 10px 12px; ${isRecording ? 'animation: pulse 1.5s infinite;' : ''}"
            title="${isRecording ? '停止录音' : '语音输入'}"
          >
            <span style="width: 18px; height: 18px;">${isRecording ? icons.micOff : icons.mic}</span>
          </button>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          </style>
        ` : ''}
        <input
          type="text"
          class="input chat-input"
          placeholder="${isRecording ? '正在录音...' : (isRealtimeVoice ? '实时语音通话中...' : (isFirstMessage && messages.length === 0 ? '告诉我你的名字，给我取个名字吧...' : `给 ${assistantName} 发消息...`))}"
          .value=${input}
          @input=${(e: InputEvent) => onInputChange((e.target as HTMLInputElement).value)}
          @keydown=${handleKeyDown}
          ?disabled=${loading || isRecording || isRealtimeVoice}
        />
        <button
          class="btn ${loading ? 'btn-danger' : 'btn-primary'}"
          @click=${loading ? onInterrupt : onSend}
          ?disabled=${!loading && (!input.trim() || isRealtimeVoice)}
          style="padding: 10px 16px;"
          title="${loading ? '打断 AI 执行' : '发送消息'}"
        >
          ${loading
            ? html`
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            `
            : html`<span style="width: 18px; height: 18px;">${icons.send}</span>`
          }
        </button>
      </div>
      ${isRealtimeVoice ? html`
        <div class="realtime-voice-overlay" style="
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: 16px 24px;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          min-width: 280px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            color: ${realtimeStatus === 'connected' || realtimeStatus === 'listening' ? 'var(--green)' : realtimeStatus === 'speaking' ? 'var(--accent)' : 'var(--text-secondary)'};
            font-size: var(--text-sm);
            font-weight: 500;
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: currentColor;
              ${realtimeStatus === 'listening' || realtimeStatus === 'speaking' ? 'animation: pulse 1s infinite;' : ''}
            "></span>
            ${realtimeStatus === 'connecting' ? '正在连接...' :
              realtimeStatus === 'connected' ? '已连接，开始说话...' :
              realtimeStatus === 'listening' ? '正在听...' :
              realtimeStatus === 'speaking' ? '正在回复...' :
              '已断开'}
          </div>
          ${realtimeTranscript ? html`
            <div style="
              font-size: var(--text-sm);
              color: var(--text-primary);
              text-align: center;
              max-width: 300px;
              line-height: 1.4;
            ">${realtimeTranscript}</div>
          ` : ''}
          <button
            class="btn btn-danger"
            @click=${onRealtimeVoiceToggle}
            style="padding: 8px 16px; font-size: var(--text-sm);"
          >
            <span style="width: 14px; height: 14px; margin-right: 6px;">${icons.phoneOff}</span>
            结束通话
          </button>
        </div>
      ` : ''}
      </div>
    </div>
  `;
}
