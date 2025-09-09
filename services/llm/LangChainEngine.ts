import { ChainEngine, ToolDef } from './ChainEngine';
import { ChatTurn } from '../../storage/memory/MemoryStore';
import path from 'path';
import fs from 'fs';

// We import from 'langchain' to satisfy dependency usage; during tests it's mocked via Jest.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LangChain = require('langchain');

export class LangChainEngine implements ChainEngine {
  private readonly model: any;
  private readonly temperature: number;

  constructor(modelInstance?: any) {
    const cfg = loadConfig();
    this.temperature = Number(cfg?.llm?.temperature ?? 0.2);

    if (modelInstance) {
      this.model = modelInstance;
    } else {
      const ChatOpenAI = LangChain?.ChatOpenAI ?? class { invoke = async (input: any) => ({ content: String(input) }); };
      const modelName = cfg?.llm?.model || cfg?.llm?.chat_model || 'gpt-4o-mini';
      this.model = new ChatOpenAI({ modelName, temperature: this.temperature });
    }
  }

  async runChatChain(input: {
    systemPrompt?: string;
    messages: ChatTurn[];
    role?: string;
    tools?: ToolDef[];
    extraContext?: string;
  }): Promise<{ text: string }> {
    const PromptTemplate = LangChain?.PromptTemplate ?? FallbackPromptTemplate;

    const template = [
      '{system}',
      '{role}',
      '{context}',
      'Conversation so far:',
      '{history}',
      'Latest user message will be at the end of history above. Provide your best assistant reply.'
    ].join('\n');

    const formatter = new PromptTemplate({ template, inputVariables: ['system', 'role', 'context', 'history'] });

    const sys = input.systemPrompt ? String(input.systemPrompt) : '';
    const role = input.role ? `Role: ${input.role}` : '';
    const ctx = input.extraContext ? `Context: ${input.extraContext}` : '';

    const history = input.messages
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join('\n');

    const finalPrompt = await formatter.format({ system: sys, role, context: ctx, history });

    // Step 5: lightweight tool-calling path if tools and last user message requests a tool
    let lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    // Map "list project files" to a tool call
    if (lastUser && typeof lastUser.content === 'string' && lastUser.content.trim().toLowerCase() === 'list project files') {
      lastUser = { ...lastUser, content: 'tool: project-file-list {}' };
      // Replace the last user message in the messages array
      input.messages = [...input.messages.slice(0, -1), lastUser];
    }
    if (input.tools && input.tools.length && lastUser && typeof lastUser.content === 'string') {
      const m = /tool:\s*([a-zA-Z0-9_\-]+)\s*(\{[\s\S]*\})/m.exec(lastUser.content);
      if (m) {
        const toolName = m[1];
        const argsJson = m[2];
        try {
          const args = JSON.parse(argsJson);
          const def = input.tools.find((t) => t.name === toolName);
          const structured: any = def && (def as any).parameters && (def as any).parameters.__structuredTool;
          if (structured && typeof structured.invoke === 'function') {
            const out = await structured.invoke(args);
            return { text: typeof out === 'string' ? out : JSON.stringify(out) };
          } else if (def && typeof (def as any).invoke === 'function') {
            // Fallback: call invoke directly if present
            const out = await (def as any).invoke(args);
            return { text: typeof out === 'string' ? out : JSON.stringify(out) };
          }
        } catch {
          // fall through to model if parsing/invocation fails
        }
      }
    }

    const result = await this.model.invoke(finalPrompt);
    const text = typeof result === 'string' ? result : (result?.content ?? String(result));
    return { text };
  }
  /**
   * Streaming version of runChatChain. Yields tokens/chunks as they are generated.
   * Usage: for await (const token of runChatChainStream(...)) { ... }
   */
  async *runChatChainStream(input: {
    systemPrompt?: string;
    messages: ChatTurn[];
    role?: string;
    tools?: ToolDef[];
    extraContext?: string;
  }): AsyncGenerator<string, void, unknown> {
    const PromptTemplate = (LangChain?.PromptTemplate ?? FallbackPromptTemplate);
    const template = [
      '{system}',
      '{role}',
      '{context}',
      'Conversation so far:',
      '{history}',
      'Latest user message will be at the end of history above. Provide your best assistant reply.'
    ].join('\n');
    const formatter = new PromptTemplate({ template, inputVariables: ['system', 'role', 'context', 'history'] });
    const sys = input.systemPrompt ? String(input.systemPrompt) : '';
    const role = input.role ? `Role: ${input.role}` : '';
    const ctx = input.extraContext ? `Context: ${input.extraContext}` : '';
    const history = input.messages
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join('\n');
    const finalPrompt = await formatter.format({ system: sys, role, context: ctx, history });

    // If the model supports streaming, use it. Otherwise, yield the full result at once.
    if (this.model && typeof this.model.stream === 'function') {
      // Assume model.stream returns an async iterator of tokens/chunks
      for await (const chunk of this.model.stream(finalPrompt)) {
        yield typeof chunk === 'string' ? chunk : (chunk?.content ?? String(chunk));
      }
    } else {
      // Fallback: yield the full result at once
      const result = await this.model.invoke(finalPrompt);
      const text = typeof result === 'string' ? result : (result?.content ?? String(result));
      yield text;
    }
  }

  async runPlanningChain(input: {
    projectState: { title: string; summary?: string; goals?: string[] };
    role?: string;
    extraContext?: string;
  }): Promise<{ outline: string }> {
    const PromptTemplate = LangChain?.PromptTemplate ?? FallbackPromptTemplate;
    const tmpl = [
      'You are a planning assistant. Create a concise outline of tasks.',
      '{role}',
      '{context}',
      'Project: {title}',
      '{summary}',
      '{goals}'
    ].join('\n');

    const pt = new PromptTemplate({
      template: tmpl,
      inputVariables: ['role', 'context', 'title', 'summary', 'goals']
    });

    const role = input.role ? `Role: ${input.role}` : '';
    const context = input.extraContext ? `Context: ${input.extraContext}` : '';
    const { title, summary, goals } = input.projectState;
    const goalsStr = goals && goals.length ? `Goals: ${goals.join('; ')}` : '';
    const summaryStr = summary ? `Summary: ${summary}` : '';

    const prompt = await pt.format({ role, context, title, summary: summaryStr, goals: goalsStr });
    const result = await this.model.invoke(prompt);
    const outline = typeof result === 'string' ? result : (result?.content ?? String(result));
    return { outline };
  }
}

function loadConfig(): any {
  try {
    const p = path.resolve(__dirname, '../../config/mira.json');
    // __dirname is services/llm in dist; adjust for src using rootDir '.'
    const candidates = [
      path.resolve(__dirname, '../../config/mira.json'),
      path.resolve(__dirname, '../../../config/mira.json'),
      path.resolve(process.cwd(), 'config/mira.json')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(c);
      }
    }
  } catch (_e) {
    // ignore
  }
  return {};
}

class FallbackPromptTemplate {
  template: string;
  inputVariables: string[];
  constructor(opts: { template: string; inputVariables: string[] }) {
    this.template = opts.template;
    this.inputVariables = opts.inputVariables;
  }
  async format(vars: Record<string, any>): Promise<string> {
    let out = this.template;
    for (const k of Object.keys(vars)) {
      out = out.split(`{${k}}`).join(String(vars[k] ?? ''));
    }
    return out;
  }
}

export default LangChainEngine;
