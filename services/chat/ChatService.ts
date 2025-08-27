import { EventEmitter } from 'events';

export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number; // epoch ms
  meta?: Record<string, unknown>;
}

export interface ChatServiceOptions {
  maxHistory?: number; // limit to prevent unbounded growth
}

export class ChatService {
  private messages: ChatMessage[] = [];
  private events = new EventEmitter();
  private readonly maxHistory: number;

  constructor(opts: ChatServiceOptions = {}) {
    this.maxHistory = opts.maxHistory ?? 200;
  }

  on(event: 'message', listener: (msg: ChatMessage) => void) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }

  addMessage(role: Role, content: string, meta?: Record<string, unknown>): ChatMessage {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: Date.now(),
      meta,
    };
    this.messages.push(msg);
    if (this.messages.length > this.maxHistory) {
      this.messages.splice(0, this.messages.length - this.maxHistory);
    }
    this.events.emit('message', msg);
    return msg;
  }

  addUserMessage(content: string, meta?: Record<string, unknown>) {
    return this.addMessage('user', content, meta);
  }

  addAssistantMessage(content: string, meta?: Record<string, unknown>) {
    return this.addMessage('assistant', content, meta);
  }

  getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  reset() {
    this.messages = [];
  }
}
