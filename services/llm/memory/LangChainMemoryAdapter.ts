import { MemoryStore, ChatTurn } from '../../../storage/memory/MemoryStore';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

/**
 * MemoryStoreChatHistory adapts our MemoryStore to a LangChain-like ChatMessageHistory interface.
 * We intentionally keep the surface minimal (getMessages/addMessage/clear) to avoid tight coupling.
 */
export class MemoryStoreChatHistory {
  constructor(private readonly store: MemoryStore, private readonly sessionId: string) {}

  async getMessages(): Promise<ChatMessage[]> {
    const hist = this.store.getHistory(this.sessionId);
    return hist.map((t) => ({ role: t.role, content: t.content }));
  }

  async addMessage(message: ChatMessage): Promise<void> {
    const turn: ChatTurn = { role: message.role, content: message.content, timestamp: Date.now() };
    this.store.append(this.sessionId, turn);
  }

  async clear(): Promise<void> {
    this.store.clear(this.sessionId);
  }
}

export default MemoryStoreChatHistory;
