import type { GraphAdapter } from '../graph/GraphAdapter';

export type RoleTemplates = Record<string, string>;

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: any;
}

export interface VectorStoreLike {
  search: (namespace: string, vector: number[], topK: number) => Promise<VectorSearchResult[]>;
}

export interface LLMClientLike {
  embed: (text: string) => Promise<number[]>;
  chat: (prompt: string, opts?: Record<string, unknown>) => Promise<{ text: string }>;
}

export interface ChatServiceDeps {
  vectorStore: VectorStoreLike;
  graphAdapter?: GraphAdapter;
  llmClient: LLMClientLike;
  roleTemplates?: RoleTemplates;
  namespace?: string;
}

export class ChatService {
  private readonly vectorStore: VectorStoreLike;
  private readonly graphAdapter?: GraphAdapter;
  private readonly llmClient: LLMClientLike;
  private readonly roleTemplates: RoleTemplates;
  private readonly namespace: string;

  constructor({ vectorStore, graphAdapter, llmClient, roleTemplates, namespace }: ChatServiceDeps) {
    this.vectorStore = vectorStore;
    this.graphAdapter = graphAdapter;
    this.llmClient = llmClient;
    this.roleTemplates = roleTemplates ?? {};
    this.namespace = namespace ?? 'default';
  }

  async generateResponse({ role, userText, topK = 5 }: { role: string; userText: string; topK?: number; }): Promise<{ text: string; citations: any[]; }> {
    const queryVec = await this.llmClient.embed(userText);
    const results = await this.vectorStore.search(this.namespace, queryVec, Math.max(1, topK));

    const contexts: string[] = [];
    const citations: any[] = [];
    for (const r of results) {
      const md = r.metadata ?? {};
      const t = pickTextFromMetadata(md);
      if (t) contexts.push(t);
      citations.push(md);
    }

    const prompt = this.assemblePrompt(role, userText, contexts);
    const res = await this.llmClient.chat(prompt, { role, topK, citations });
    return { text: res.text, citations };
  }

  private assemblePrompt(role: string, userText: string, contexts: string[]): string {
    const template = this.roleTemplates[role] ?? defaultTemplate;
    const joined = contexts.join('\n---\n');
    let out = template;
    out = out.split('{role}').join(role);
    out = out.split('{userText}').join(userText);
    out = out.split('{contexts}').join(joined);
    out = out.split('{context}').join(joined);
    return out;
  }
}

const defaultTemplate = [
  'You are {role}.',
  'Use the following context to answer the user question.',
  'Context:',
  '{contexts}',
  'Question: {userText}',
  'Answer:',
].join('\n');

function pickTextFromMetadata(md: any): string | undefined {
  if (!md) return undefined;
  if (typeof md.text === 'string') return md.text;
  if (typeof md.content === 'string') return md.content;
  if (typeof md.snippet === 'string') return md.snippet;
  if (typeof md.path === 'string' && typeof md.start === 'number' && typeof md.end === 'number') {
    // If there is a pre-extracted chunk text
    if (typeof md.chunk === 'string') return md.chunk;
  }
  return undefined;
}
