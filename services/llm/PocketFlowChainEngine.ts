import PocketFlow from 'pocketflow';
import { ChainEngine, ToolDef } from './ChainEngine';
import { ChatTurn } from '../../storage/memory/MemoryStore';

export class PocketFlowChainEngine implements ChainEngine {
  private readonly pf: PocketFlow;

  constructor(pfInstance?: PocketFlow) {
    this.pf = pfInstance ?? new PocketFlow();
  }

  async runChatChain(input: {
    systemPrompt?: string;
    messages: ChatTurn[];
    role?: string;
    tools?: ToolDef[];
    extraContext?: string;
  }): Promise<{ text: string }> {
    const messages = input.messages.map((m) => ({ role: m.role, content: m.content }));
    const res = await this.pf.chat({
      systemPrompt: input.systemPrompt,
      messages,
      role: input.role,
      tools: input.tools,
      context: input.extraContext ? { extraContext: input.extraContext } : undefined
    });
    return { text: res.text };
  }

  async runPlanningChain(input: {
    projectState: { title: string; summary?: string; goals?: string[] };
    role?: string;
    extraContext?: string;
  }): Promise<{ outline: string }> {
    const { title, summary, goals } = input.projectState;
    const res = await this.pf.plan({
      title,
      summary,
      goals,
      context: { role: input.role, extraContext: input.extraContext }
    });
    return { outline: res.outline };
  }
}

export default PocketFlowChainEngine;
