import { ChatTurn } from '../../storage/memory/MemoryStore';

export type ToolDef = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export interface ChainEngine {
  runChatChain(input: {
    systemPrompt?: string;
    messages: ChatTurn[]; // includes user/assistant/system
    role?: string;
    tools?: ToolDef[];
    extraContext?: string;
  }): Promise<{ text: string }>;

  runPlanningChain(input: {
    projectState: { title: string; summary?: string; goals?: string[] };
    role?: string;
    extraContext?: string;
  }): Promise<{ outline: string }>;
}
