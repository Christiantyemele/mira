const PocketFlow: any = require('pocketflow');
import { ChainEngine, ToolDef } from './ChainEngine';
import { ChatTurn } from '../../storage/memory/MemoryStore';
// @ts-ignore
import type { ChatMessage } from 'pocketflow';

export class PocketFlowChainEngine implements ChainEngine {
  private readonly pf: any;

  constructor(pfInstance?: any) {
    this.pf = pfInstance ?? PocketFlow();
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
  async summarizeDocuments(input: { documents: string[]; systemPrompt?: string }): Promise<{ summary: string }> {
    const systemPrompt = input.systemPrompt ?? "Summarize the following documents:";
    const messages: ChatMessage[] = input.documents.map((doc, i) => ({
      role: "user" as const,
      content: `Document ${i + 1}:\n${doc}`
    }));
    const res = await this.pf.chat({
      systemPrompt,
      messages
    });
    return { summary: res.text };
  }
}

export default PocketFlowChainEngine;
