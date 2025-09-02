import { LangChainEngine } from '../../services/llm/LangChainEngine';
import { createVectorSearchTool } from '../../services/tools/langchain/ToolAdapters';
import { VectorStore } from '../../storage/vector-db/VectorStore';
import { LiteLLMClient } from '../../services/llm/LiteLLMClient';

// We simulate a chat where the user instructs the agent to call a tool explicitly.

describe('LangChainEngine tool-calling (lightweight)', () => {
  it('invokes a structured tool when the latest user message includes a tool directive', async () => {
    const vs = new VectorStore();
    const embedder = new LiteLLMClient({ mode: 'mock', embedDim: 8 });
    const vec = await embedder.embed('jest');
    await vs.upsert('ns', 'd1', vec, { text: 'Jest testing tips' });

    const vectorTool = createVectorSearchTool({ vectorStore: vs as any, embedder, namespace: 'ns', defaultTopK: 1 });

    // Provide tool to engine via ChainEngine ToolDef, attaching the structured tool instance under parameters.__structuredTool
    const toolDef = { name: 'vector_search', description: 'Search vectors', parameters: { __structuredTool: vectorTool } } as any;

    const engine = new LangChainEngine({
      invoke: jest.fn(async (prompt: string) => ({ content: `MODEL:${prompt.slice(0, 20)}` }))
    });

    const res = await engine.runChatChain({
      systemPrompt: 'SYS',
      role: 'Developer',
      extraContext: 'CTX',
      tools: [toolDef],
      messages: [
        { role: 'system', content: 'S', timestamp: 1 },
        { role: 'user', content: 'Hi', timestamp: 2 },
        { role: 'assistant', content: 'Hello', timestamp: 3 },
        { role: 'user', content: 'tool: vector_search {"query":"jest","topK":1}', timestamp: 4 }
      ]
    });

    expect(res.text.toLowerCase()).toContain('jest');
  });
});
