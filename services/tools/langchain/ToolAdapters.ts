import { z } from 'zod';
import { TerminalService } from '../../terminal/TerminalService';
import { VectorStore } from '../../../storage/vector-db/VectorStore';
import { LiteLLMClient } from '../../llm/LiteLLMClient';

export type StructuredTool<TSchema extends z.ZodTypeAny = any> = {
  name: string;
  description?: string;
  schema: TSchema;
  invoke: (input: z.infer<TSchema>) => Promise<any>;
};

export function createTerminalTool(terminal: TerminalService): StructuredTool<z.ZodObject<{ command: z.ZodString }>> {
  const schema = z.object({ command: z.string() });
  return {
    name: 'terminal_execute',
    description: 'Execute a shell command in a new ephemeral terminal session and return its output (stub).',
    schema,
    invoke: async ({ command }) => {
      const session = terminal.createSession({ name: 'agent' });
      terminal.write(session.session_id, command);
      const lines = terminal.readLogs(session.session_id, null, null);
      return lines.map((l) => `[${l.stream}] ${l.data}`).join('\n');
    }
  };
}

export function createVectorSearchTool(params: {
  vectorStore: VectorStore;
  embedder: LiteLLMClient;
  namespace?: string;
  defaultTopK?: number;
}): StructuredTool<z.ZodObject<{ query: z.ZodString; topK: z.ZodOptional<z.ZodNumber> }>> {
  const schema = z.object({ query: z.string(), topK: z.number().int().positive().max(100).optional() });
  const namespace = params.namespace ?? 'default';
  const topKDefault = Math.max(1, Math.min(20, params.defaultTopK ?? 5));
  return {
    name: 'vector_search',
    description: 'Search the project vector store for relevant contexts to the query and return snippets.',
    schema,
    invoke: async ({ query, topK }) => {
      const vec = await params.embedder.embed(query);
      const results = await params.vectorStore.search(namespace, vec, Math.max(1, topK ?? topKDefault));
      const out = results.map((r) => r.metadata?.text || r.metadata?.content || r.metadata?.snippet || JSON.stringify(r.metadata));
      return out;
    }
  };
}
