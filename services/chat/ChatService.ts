import type { GraphAdapter } from '../graph/GraphAdapter';
import type { ILLMOrchestrator } from '../orchestrator/LLMOrchestrator';

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
}

export interface ChatServiceDeps {
  vectorStore: VectorStoreLike;
  graphAdapter?: GraphAdapter;
  llmClient: LLMClientLike; // used only for embeddings
  orchestrator: ILLMOrchestrator;
  roleTemplates?: RoleTemplates;
  namespace?: string;
}

export class ChatService {
  private readonly vectorStore: VectorStoreLike;
  private readonly graphAdapter?: GraphAdapter;
  private readonly llmClient: LLMClientLike;
  private readonly orchestrator: ILLMOrchestrator;
  private readonly roleTemplates: RoleTemplates;
  private readonly namespace: string;

  constructor({ vectorStore, graphAdapter, llmClient, orchestrator, roleTemplates, namespace }: ChatServiceDeps) {
    this.vectorStore = vectorStore;
    this.graphAdapter = graphAdapter;
    this.llmClient = llmClient;
    this.orchestrator = orchestrator;
    this.roleTemplates = roleTemplates ?? {};
    this.namespace = namespace ?? 'default';
  }

  async generateResponse({ projectId, role, userText, topK = 5 }: { projectId: string; role: string; userText: string; topK?: number; }): Promise<{ text: string; citations: any[]; }> {
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

    const systemPrompt = this.assembleSystemPrompt(role, contexts);
    const { reply } = await this.orchestrator.orchestrateChat(userText, {
      sessionId: projectId,
      role,
      systemPrompt
    });

    return { text: reply, citations };
  }

  private assembleSystemPrompt(role: string, contexts: string[]): string {
    const template = this.roleTemplates[role] ?? defaultSystemTemplate;
    const joined = contexts.join('\n---\n');
    let out = template;
    out = out.split('{role}').join(role);
    out = out.split('{contexts}').join(joined);
    out = out.split('{context}').join(joined);
    // Intentionally do not include {userText} in system prompt; the user's message is passed separately to the orchestrator
    out = out.replace('{userText}', '');
    return out;
  }
}

const defaultSystemTemplate = [
  'You are {role}.',
  'Use the following context to assist the user.',
  'Context:',
  '{contexts}'
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
