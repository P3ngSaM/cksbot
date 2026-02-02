# CKS Bot

> AI 语音助手 - 通过飞书机器人接收指令，在 macOS 上执行自动化任务

## 功能特性

- 🎙️ **实时语音对话** - 基于通义千问 Qwen 的实时语音交互
- 🤖 **智能任务执行** - 自动化 macOS 操作（打开应用、发送消息、执行脚本）
- 💬 **飞书集成** - 通过飞书机器人接收指令
- 🎨 **Apple 风格 UI** - 精美的 Web 界面，遵循 Apple HIG 设计规范
- 🧠 **记忆功能** - 记住用户偏好和习惯
- 📅 **定时任务** - 支持定时发送消息和执行任务

## 技术栈

- **后端**: Node.js + TypeScript + Hono
- **前端**: Lit + Vite + Apple Design System
- **AI**: Anthropic Claude + Qwen (通义千问)
- **集成**: 飞书开放平台 SDK

## 快速开始

### 1. 安装依赖

```bash
npm install
cd ui && npm install
```

### 2. 配置

创建配置文件 `~/.cksbot/config.json`:

```json
{
  "models": {
    "anthropic": {
      "apiKey": "your-anthropic-api-key",
      "model": "claude-sonnet-4-5-20250929"
    },
    "qwen": {
      "apiKey": "your-qwen-api-key",
      "speechRate": 1.2
    }
  },
  "channels": {
    "feishu": {
      "appId": "your-feishu-app-id",
      "appSecret": "your-feishu-app-secret",
      "mode": "websocket",
      "requireMention": false
    }
  },
  "gateway": {
    "port": 18789,
    "host": "0.0.0.0"
  }
}
```

### 3. 构建

```bash
npm run build
npm run ui:build
```

### 4. 运行

```bash
npm run cksbot gateway run
```

访问 http://localhost:18789 查看 Web 界面。

## 使用方法

### 语音对话

1. 打开 Web 界面
2. 点击"对话"标签
3. 点击电话图标开始实时语音对话
4. 说出你的指令，例如：
   - "打开百度搜索 AI 新闻"
   - "飞书给张三发消息说明天开会"
   - "提醒我明天下午 3 点开会"

### 飞书集成

在飞书中 @机器人 发送指令即可。

## macOS 自动化

支持的操作：

- ✅ 打开应用
- ✅ 发送飞书/微信消息（通过 UI 自动化）
- ✅ 执行 AppleScript
- ✅ 模拟键盘输入
- ✅ 截图并分析

## 开发

```bash
# 启动后端监听模式
npm run dev

# 启动前端开发服务器
npm run ui

# 运行测试
npm test
```

## 项目结构

```
cksbot/
├── src/              # 后端代码
│   ├── agents/       # Agent 逻辑
│   ├── cli/          # CLI 命令
│   ├── config/       # 配置管理
│   ├── feishu/       # 飞书集成
│   ├── gateway/      # WebSocket 网关
│   └── services/     # 服务层
├── ui/               # 前端代码
│   ├── src/
│   │   ├── ui/       # UI 组件
│   │   └── styles/   # Apple 设计系统
│   └── dist/         # 构建输出
└── package.json
```

## Apple 设计系统

本项目使用真实的 Apple 设计规范：

- 🎨 精确的颜色系统（匹配 Apple HIG）
- ✨ 玻璃态效果（毛玻璃 + 饱和度增强）
- 🌈 柔和的多层阴影
- 📐 Apple 的圆角半径
- ⚡ 流畅的动画曲线
- 🌓 完整的暗黑模式支持

详见 `ui/QUICK_START_APPLE_DESIGN.md`

## License

MIT

## 致谢

- [Anthropic Claude](https://www.anthropic.com/) - 强大的 AI 模型
- [通义千问](https://tongyi.aliyun.com/) - 实时语音能力
- [飞书开放平台](https://open.feishu.cn/) - 企业协作集成
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) - 设计灵感
