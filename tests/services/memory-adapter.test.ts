import { MemoryStore } from '../../storage/memory/MemoryStore';
import { MemoryStoreChatHistory } from '../../services/llm/memory/LangChainMemoryAdapter';

describe('MemoryStoreChatHistory adapter', () => {
  it('writes and reads messages via adapter and persists in MemoryStore', async () => {
    const store = new MemoryStore();
    const sessionId = 'sess-1';
    const hist = new MemoryStoreChatHistory(store, sessionId);

    await hist.addMessage({ role: 'user', content: 'Hello' });
    await hist.addMessage({ role: 'assistant', content: 'Hi!' });

    const msgs = await hist.getMessages();
    expect(msgs).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' }
    ]);

    const raw = store.getHistory(sessionId);
    expect(raw.map(t => t.content)).toEqual(['Hello', 'Hi!']);
  });

  it('rehydrates across instances using the same sessionId', async () => {
    const store = new MemoryStore();
    const sessionId = 'sess-2';
    const h1 = new MemoryStoreChatHistory(store, sessionId);
    await h1.addMessage({ role: 'user', content: 'First' });

    const h2 = new MemoryStoreChatHistory(store, sessionId);
    const msgs = await h2.getMessages();
    expect(msgs).toEqual([{ role: 'user', content: 'First' }]);
  });
});
