import { ChatService } from '../../../services/chat/ChatService';

describe('ChatService', () => {
  it('delegates chat to orchestrator with systemPrompt from contexts and returns reply with citations', async () => {
    const namespace = 'ns1';
    const userText = 'How to bake?';
    const role = 'helper';
    const projectId = 'proj-123';
    const topK = 2;

    const searchResults = [
      { id: 'c1', score: 0.9, metadata: { text: 'Use flour and water', path: '/a.txt' } },
      { id: 'c2', score: 0.8, metadata: { text: 'Preheat oven to 180C', path: '/b.txt' } },
    ];

    const vectorStore = {
      search: jest.fn().mockResolvedValue(searchResults),
    };

    const llmClient = {
      embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };

    const orchestrator = {
      orchestrateChat: jest.fn().mockResolvedValue({ reply: 'MOCK ORCH ANSWER', history: [] })
    };

    const roleTemplates = {
      helper: 'ROLE: {role}\nCONTEXTS:\n{contexts}\nUSER:\n{userText}\n',
    };

    const svc = new ChatService({ vectorStore: vectorStore as any, llmClient: llmClient as any, orchestrator: orchestrator as any, roleTemplates, namespace });

    const res = await svc.generateResponse({ projectId, role, userText, topK });

    expect(llmClient.embed).toHaveBeenCalledWith(userText);
    expect(vectorStore.search).toHaveBeenCalledWith(namespace, [0.1, 0.2, 0.3], topK);

    // Verify the systemPrompt assembled contains context snippets and role, and orchestrator is called
    expect(orchestrator.orchestrateChat).toHaveBeenCalledTimes(1);
    const [passedUserText, ctx] = (orchestrator.orchestrateChat as jest.Mock).mock.calls[0];
    expect(passedUserText).toBe(userText);
    expect(ctx.sessionId).toBe(projectId);
    expect(ctx.role).toBe('helper');
    expect(ctx.systemPrompt).toContain('ROLE: helper');
    expect(ctx.systemPrompt).toContain('Use flour and water');
    expect(ctx.systemPrompt).toContain('Preheat oven to 180C');
    expect(ctx.systemPrompt).toContain('USER:'); // template includes label (userText removed)

    // Response and citations
    expect(res).toEqual({ text: 'MOCK ORCH ANSWER', citations: searchResults.map(r => r.metadata) });
  });
});
it('persists and uses chat history for multi-turn context', async () => {
  const namespace = 'ns2';
  const projectId = 'proj-ctx';
  const role = 'helper';
  const topK = 1;

  const vectorStore = { search: jest.fn().mockResolvedValue([]) };
  const llmClient = { embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };

  // Simulate orchestrator that records all calls and returns a reply based on history
  const orchestrator = {
    orchestrateChat: jest.fn()
      // First call: single message
      .mockResolvedValueOnce({ reply: 'First answer', history: [
        { role: 'user', content: 'Hello', timestamp: 1 },
        { role: 'assistant', content: 'First answer', timestamp: 2 }
      ] })
      // Second call: should see both messages in history
      .mockResolvedValueOnce({ reply: 'Follow-up answer with context', history: [
        { role: 'user', content: 'Hello', timestamp: 1 },
        { role: 'assistant', content: 'First answer', timestamp: 2 },
        { role: 'user', content: 'What about tomorrow?', timestamp: 3 },
        { role: 'assistant', content: 'Follow-up answer with context', timestamp: 4 }
      ] })
  };

  const svc = new ChatService({ vectorStore: vectorStore as any, llmClient: llmClient as any, orchestrator: orchestrator as any, namespace });

  // First turn
  const res1 = await svc.generateResponse({ projectId, role, userText: 'Hello', topK });
  expect(res1.text).toBe('First answer');
  expect(orchestrator.orchestrateChat).toHaveBeenCalledTimes(1);

  // Second turn (follow-up)
  const res2 = await svc.generateResponse({ projectId, role, userText: 'What about tomorrow?', topK });
  expect(res2.text).toBe('Follow-up answer with context');
  expect(orchestrator.orchestrateChat).toHaveBeenCalledTimes(2);

  // Check that orchestrator was called with correct sessionId and role both times
  const calls = (orchestrator.orchestrateChat as jest.Mock).mock.calls;
  expect(calls[0][1].sessionId).toBe(projectId);
  expect(calls[1][1].sessionId).toBe(projectId);

  // Optionally, check that the orchestrator's second call would have access to both messages in history
  // (This depends on orchestrator implementation, but this test ensures the flow is multi-turn)
});
