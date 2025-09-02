declare module 'pocketflow' {
  export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
  export type ToolDef = { name: string; description?: string; parameters?: Record<string, unknown> };
  export default class PocketFlow {
    constructor(opts?: Record<string, unknown>);
    chat(input: {
      systemPrompt?: string;
      messages: ChatMessage[];
      role?: string;
      tools?: ToolDef[];
      context?: Record<string, unknown>;
    }): Promise<{ text: string; raw?: any }>;
    plan(input: {
      title: string;
      summary?: string;
      goals?: string[];
      context?: Record<string, unknown>;
    }): Promise<{ outline: string; raw?: any }>;
  }
}
