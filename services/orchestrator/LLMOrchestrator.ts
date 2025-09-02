import { LiteLLMClient } from '../llm/LiteLLMClient';
import { ChatTurn, MemoryStore } from '../../storage/memory/MemoryStore';
import { Plan, Task } from '../planner/PlannerService';
import { ChainEngine, ToolDef } from '../llm/ChainEngine';
import path from 'path';
import fs from 'fs';

export type OrchestratorContext = {
  sessionId: string; // key for MemoryStore per chat/workspace
  role?: string; // user role, e.g., Developer, Architect
  tools?: ToolDef[];
  systemPrompt?: string;
  extraContext?: string; // arbitrary context blob
};

export interface ILLMOrchestrator {
  orchestrateChat(userMessage: string, context: OrchestratorContext): Promise<{ reply: string; history: ChatTurn[] }>;
  planTasks(projectState: { title: string; summary?: string; goals?: string[] }, context?: OrchestratorContext): Promise<Plan>;
}

export class LLMOrchestrator implements ILLMOrchestrator {
  private engine: ChainEngine;
  constructor(
    private readonly client: LiteLLMClient,
    private readonly memory: MemoryStore,
    engine?: ChainEngine
  ) {
    if (engine) {
      this.engine = engine;
    } else {
      // Decide engine based on config.llm.framework (default: pocketflow)
      const cfg = safeLoadConfig();
      const framework = (cfg?.llm?.framework ?? 'pocketflow').toLowerCase();
      if (framework === 'langchain') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: LangChainEngine } = require('../llm/LangChainEngine');
        this.engine = new LangChainEngine();
      } else {
        // Lazy load pocketflow adapter to avoid forcing resolution when not needed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: PocketFlowChainEngine } = require('../llm/PocketFlowChainEngine');
        this.engine = new PocketFlowChainEngine();
      }
    }
  }


  async orchestrateChat(userMessage: string, context: OrchestratorContext): Promise<{ reply: string; history: ChatTurn[] }> {
    const sessionId = context.sessionId;
    const now = Date.now();

    // Persist user message first
    const userTurn: ChatTurn = { role: 'user', content: userMessage, timestamp: now };
    this.memory.append(sessionId, userTurn);

    // Load history (including userTurn)
    const history = this.memory.getHistory(sessionId);

    const { text } = await this.engine.runChatChain({
      systemPrompt: context.systemPrompt,
      messages: history,
      role: context.role,
      tools: context.tools,
      extraContext: context.extraContext
    });

    // Persist assistant reply
    const assistantTurn: ChatTurn = { role: 'assistant', content: text, timestamp: Date.now() };
    this.memory.append(sessionId, assistantTurn);

    const updatedHistory = this.memory.getHistory(sessionId);
    return { reply: text, history: updatedHistory };
  }

  async planTasks(
    projectState: { title: string; summary?: string; goals?: string[] },
    context?: OrchestratorContext
  ): Promise<Plan> {
    // Use engine to get an outline via PocketFlow SDK
    await this.engine.runPlanningChain({ projectState, role: context?.role, extraContext: context?.extraContext });

    // Produce a minimal deterministic plan structure; IDs time-based for simplicity
    const nowIso = new Date().toISOString();
    const baseId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const tasks: Task[] = [
      { id: baseId + '-1', description: `Analyze project: ${projectState.title}`, status: 'todo', assignee_role: 'Architect' },
      { id: baseId + '-2', description: 'Design approach and outline changes', status: 'todo', assignee_role: 'Architect' },
      { id: baseId + '-3', description: 'Implement minimal viable changes', status: 'todo', assignee_role: 'Developer' },
      { id: baseId + '-4', description: 'Write and run tests', status: 'todo', assignee_role: 'Debugger' }
    ];

    const plan: Plan = {
      id: baseId,
      title: projectState.title,
      description: projectState.summary,
      tasks,
      created_at: nowIso,
      updated_at: nowIso
    };
    return plan;
  }
}

export default LLMOrchestrator;

// Helper to load config safely at runtime without hard import
function safeLoadConfig(): any {
  try {
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
