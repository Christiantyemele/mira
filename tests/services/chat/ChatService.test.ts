import { ChatService } from '../../../services/chat/ChatService';

describe('ChatService', () => {
  it('assembles prompt with top contexts and returns mock LLM response with citations', async () => {
    const namespace = 'ns1';
    const userText = 'How to bake?';
    const role = 'helper';
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
      chat: jest.fn().mockResolvedValue({ text: 'MOCK LLM ANSWER' }),
    };

    const roleTemplates = {
      helper: 'ROLE: {role}\nCONTEXTS:\n{contexts}\nUSER:\n{userText}\n',
    };

    const svc = new ChatService({ vectorStore: vectorStore as any, llmClient: llmClient as any, roleTemplates, namespace });

    const res = await svc.generateResponse({ role, userText, topK });

    expect(llmClient.embed).toHaveBeenCalledWith(userText);
    expect(vectorStore.search).toHaveBeenCalledWith(namespace, [0.1, 0.2, 0.3], topK);

    // Verify the prompt assembled contains context snippets
    expect(llmClient.chat).toHaveBeenCalledTimes(1);
    const promptPassed = (llmClient.chat as jest.Mock).mock.calls[0][0] as string;
    expect(promptPassed).toContain('ROLE: helper');
    expect(promptPassed).toContain('Use flour and water');
    expect(promptPassed).toContain('Preheat oven to 180C');
    expect(promptPassed).toContain('USER:');
    expect(promptPassed).toContain(userText);

    // Response and citations
    expect(res).toEqual({ text: 'MOCK LLM ANSWER', citations: searchResults.map(r => r.metadata) });
  });
});
