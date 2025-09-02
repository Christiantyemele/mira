import { VectorStore } from '../../storage/vector-db/VectorStore';
import { LiteLLMClient } from '../llm/LiteLLMClient';

export type MiraDoc = { pageContent: string; metadata: any };

export class MiraVectorStoreAdapter {
  constructor(private readonly vectorStore: VectorStore, private readonly embedder: LiteLLMClient, private readonly namespace: string = 'default') {}

  async getRelevantDocuments(query: string, topK: number): Promise<MiraDoc[]> {
    const vec = await this.embedder.embed(query);
    const results = await this.vectorStore.search(this.namespace, vec, Math.max(1, topK));
    return results.map((r) => ({ pageContent: pickText(r.metadata) ?? JSON.stringify(r.metadata), metadata: r.metadata }));
  }
}

export function pickText(md: any): string | undefined {
  if (!md) return undefined;
  if (typeof md.text === 'string') return md.text;
  if (typeof md.content === 'string') return md.content;
  if (typeof md.snippet === 'string') return md.snippet;
  if (typeof md.chunk === 'string') return md.chunk;
  return undefined;
}

export default MiraVectorStoreAdapter;
