export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LiteLLMClientOptions {
  apiBase?: string;
  apiKey?: string;
  modelChat?: string;
  modelEmbedding?: string;
  timeoutMs?: number;
}

export class LiteLLMClient {
  constructor(private readonly opts: LiteLLMClientOptions = {}) {}

  async chat(messages: ChatMessage[], _options?: { stream?: boolean }): Promise<{ content: string; usage?: Record<string, unknown> }> {
    // Stubbed response; wire to LiteLLM or provider later
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const echo = lastUser ? `Echo: ${lastUser.content}` : 'Hello from LiteLLMClient stub';
    return { content: echo, usage: { model: this.opts.modelChat ?? 'stub-model' } };
  }

  async embed(input: string | string[]): Promise<{ embeddings: number[][]; model?: string }> {
    const arr = Array.isArray(input) ? input : [input];
    // Produce deterministic small vectors for bootstrap
    const embeddings = arr.map((s) => this.simpleHashVector(s));
    return { embeddings, model: this.opts.modelEmbedding ?? 'stub-embedding-model' };
  }

  private simpleHashVector(s: string): number[] {
    const dim = 8;
    const vec = new Array<number>(dim).fill(0);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      vec[i % dim] += (c % 97) / 97;
    }
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
    return vec.map((v) => Number((v / norm).toFixed(6)));
  }
}
