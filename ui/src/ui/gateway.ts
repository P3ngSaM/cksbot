/**
 * Gateway WebSocket Client
 */

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "tool_use_delta"; id: string; input: string }
  | { type: "content_block_stop" }
  | { type: "message_stop"; usage: { inputTokens: number; outputTokens: number } };

export type StreamCallback = (event: StreamEvent) => void;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    onStream?: StreamCallback;
  }>();
  private realtimeEventCallback: ((event: RealtimeVoiceEvent) => void) | null = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to gateway');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        console.log('Disconnected from gateway');
        // Auto-reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
    });
  }

  private handleMessage(message: any) {
    // Handle realtime voice events
    if (message.type && message.type.startsWith('realtime.')) {
      if (this.realtimeEventCallback) {
        const eventType = message.type.replace('realtime.', '');
        this.realtimeEventCallback({ ...message, type: eventType } as RealtimeVoiceEvent);
      }
      return;
    }

    // Handle streaming events
    if (message.method === 'agent.stream' && message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending?.onStream) {
        pending.onStream(message.params as StreamEvent);
      }
      return;
    }

    // Handle regular responses
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message || 'Request failed'));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  async request<T = any>(method: string, params?: any): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to gateway');
    }

    const id = `req_${++this.requestId}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.ws!.send(JSON.stringify(message));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Request with streaming support
   */
  async requestStream<T = any>(
    method: string,
    params: any,
    onStream: StreamCallback
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to gateway');
    }

    const id = `req_${++this.requestId}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onStream });

      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params: { ...params, stream: true },
      };

      this.ws!.send(JSON.stringify(message));

      // Timeout after 120 seconds for streaming requests
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 120000);
    });
  }

  /**
   * Text to Speech
   */
  async textToSpeech(text: string, options?: { voice?: string; speed?: number }): Promise<{
    success: boolean;
    audioBase64?: string;
    audioPath?: string;
    error?: string;
  }> {
    return this.request('speech.tts', { text, ...options });
  }

  /**
   * Speech to Text
   */
  async speechToText(audioBase64: string, options?: { language?: string }): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    return this.request('speech.stt', { audioBase64, ...options });
  }

  /**
   * Get available TTS voices
   */
  async getVoices(): Promise<string[]> {
    const result = await this.request('speech.voices');
    return result.voices ?? [];
  }

  /**
   * Analyze image with vision model
   */
  async analyzeImage(imageBase64: string, options?: { prompt?: string }): Promise<{
    success: boolean;
    description?: string;
    extractedText?: string;
    error?: string;
  }> {
    return this.request('vision.analyze', { imageBase64, ...options });
  }

  /**
   * Take screenshot and analyze
   */
  async screenshotAndAnalyze(options?: { prompt?: string }): Promise<{
    success: boolean;
    description?: string;
    extractedText?: string;
    screenshotPath?: string;
    error?: string;
  }> {
    return this.request('vision.screenshot', options);
  }

  /**
   * Realtime Voice - 连接实时语音 (Gemini Live API)
   */
  connectRealtimeVoice(options?: {
    systemPrompt?: string;
    voice?: string;  // Qwen voice: Chelsie, Serena, Ethan, Cherry
    onEvent?: (event: RealtimeVoiceEvent) => void;
  }) {
    this.realtimeEventCallback = options?.onEvent || null;

    this.send({
      type: 'realtime.connect',
      systemPrompt: options?.systemPrompt,
      voice: options?.voice,
    });
  }

  /**
   * Realtime Voice - 发送音频数据 (PCM 16-bit, 16kHz, mono, base64)
   */
  sendRealtimeAudio(audioBase64: string) {
    this.send({
      type: 'realtime.audio',
      audio: audioBase64,
    });
  }

  /**
   * Realtime Voice - 发送文本消息
   */
  sendRealtimeText(text: string) {
    this.send({
      type: 'realtime.text',
      text,
    });
  }

  /**
   * Realtime Voice - 断开连接
   */
  disconnectRealtimeVoice() {
    this.send({
      type: 'realtime.disconnect',
    });
    this.realtimeEventCallback = null;
  }

  /**
   * Internal send helper
   */
  private send(message: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Realtime Voice 事件类型
 * 支持 Voice Agent (ASR + Agent + TTS) 双向实时语音对话
 */
export type RealtimeVoiceEvent =
  | { type: "connected" }
  | { type: "setup_complete" }
  | { type: "listening" }  // 准备接收语音
  | { type: "speech_started" }  // 用户开始说话
  | { type: "speech_stopped" }  // 用户停止说话
  | { type: "user_transcript"; text: string; isFinal: boolean }  // 用户语音转写
  | { type: "thinking" }  // Agent 正在思考
  | { type: "text"; text: string; isFinal: boolean }  // Agent 回复文本
  | { type: "audio_data"; data: string }  // TTS 音频数据 (base64 PCM)
  | { type: "speaking" }  // 正在播放语音
  | { type: "turn_complete" }
  | { type: "interrupted" }
  | { type: "error"; message: string }
  | { type: "disconnected" };
