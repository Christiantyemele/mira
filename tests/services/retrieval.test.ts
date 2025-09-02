import { VectorStore } from '../../storage/vector-db/VectorStore';
import { LiteLLMClient } from '../../services/llm/LiteLLMClient';
import { MiraVectorStoreAdapter } from '../../services/retrieval/MiraVectorStore';
import { ChatService } from '../../services/chat/ChatService';

describe('Retrieval (RAG) Integration', () => {
  it('MiraVectorStoreAdapter returns relevant documents', async () => {
    const vs = new VectorStore();
    const embedder = new LiteLLMClient({ mode: 'mock', embedDim: 8 });
    const v1 = await embedder.embed('jest basics');
    const v2 = await embedder.embed('typescript intro');
    await vs.upsert('ns', 'a', v1, { text: 'Jest basics doc' });
    await vs.upsert('ns', 'b', v2, { text: 'TypeScript intro doc' });

    const retriever = new MiraVectorStoreAdapter(vs as any, embedder, 'ns');

    const docs = await retriever.getRelevantDocuments('learn jest', 1);
    expect(docs.length).toBe(1);
    expect(docs[0].pageContent.toLowerCase()).toContain('jest');
  });

  it('ChatService uses retriever when provided and includes contexts in systemPrompt', async () => {
    const vs = new VectorStore();
    const embedder = new LiteLLMClient({ mode: 'mock', embedDim: 8 });
    const retriever = new MiraVectorStoreAdapter(vs as any, embedder, 'ns');
    const v1 = await embedder.embed('bread baking');
    await vs.upsert('ns', 'x', v1, { text: 'Use flour and water' });

    const orchestrator = { orchestrateChat: jest.fn().mockResolvedValue({ reply: 'OK', history: [] }) };
    const svc = new ChatService({ vectorStore: vs as any, llmClient: embedder as any, orchestrator: orchestrator as any, roleTemplates: { chef: 'ROLE: {role}\nCONTEXTS:\n{contexts}\n' }, namespace: 'ns', retriever });

    await svc.generateResponse({ projectId: 'p', role: 'chef', userText: 'How to bake?', topK: 1 });

    const [, ctx] = (orchestrator.orchestrateChat as jest.Mock).mock.calls[0];
    expect(ctx.systemPrompt).toContain('Use flour and water');
  });
});
