import { createTerminalTool, createVectorSearchTool } from '../../services/tools/langchain/ToolAdapters';
import { TerminalService } from '../../services/terminal/TerminalService';
import { TerminalSessionStore } from '../../storage/memory/TerminalSessionStore';
import { VectorStore } from '../../storage/vector-db/VectorStore';
import { LiteLLMClient } from '../../services/llm/LiteLLMClient';
import { z } from 'zod';

describe('LangChain ToolAdapters', () => {
  describe('Terminal tool', () => {
    it('validates schema and invokes terminal to echo command', async () => {
      const store = new TerminalSessionStore();
      const term = new TerminalService(store);
      const tool = createTerminalTool(term);

      // Schema validation
      expect(() => (tool.schema as z.ZodTypeAny).parse({})).toThrow();
      const parsed = (tool.schema as z.ZodTypeAny).parse({ command: 'echo hello' });
      expect(parsed.command).toBe('echo hello');

      // Invocation
      const out = await tool.invoke({ command: 'echo hello' } as any);
      expect(typeof out).toBe('string');
      expect(out).toContain('echo hello');
    });
  });

  describe('Vector search tool', () => {
    it('embeds query and returns topK contexts from vector store', async () => {
      const vs = new VectorStore();
      const embedder = new LiteLLMClient({ mode: 'mock', embedDim: 8 });

      // Prepare vectors deterministically
      const v1 = await embedder.embed('TypeScript basics');
      const v2 = await embedder.embed('Advanced Jest testing');
      await vs.upsert('ns', 'doc1', v1, { text: 'Intro to TypeScript' });
      await vs.upsert('ns', 'doc2', v2, { text: 'Jest mocking guide' });

      const tool = createVectorSearchTool({ vectorStore: vs as any, embedder, namespace: 'ns', defaultTopK: 1 });

      // Schema validation
      const parsed = (tool.schema as z.ZodTypeAny).parse({ query: 'learn jest' });
      expect(parsed.query).toBe('learn jest');

      const results = await tool.invoke({ query: 'jest', topK: 1 } as any);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(String(results[0]).toLowerCase()).toContain('jest');
    });
  });
});
