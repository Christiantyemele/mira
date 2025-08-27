export type Role = 'user' | 'assistant' | 'system';

export interface ChatTurn {
  role: Role;
  content: string;
  timestamp: number; // epoch ms
  meta?: Record<string, unknown>;
}

export class MemoryStore {
  private store = new Map<string, ChatTurn[]>();

  append(workspaceId: string, turn: ChatTurn): void {
    const arr = this.store.get(workspaceId) ?? [];
    arr.push(turn);
    this.store.set(workspaceId, arr);
  }

  getHistory(workspaceId: string): ChatTurn[] {
    return [...(this.store.get(workspaceId) ?? [])];
  }

  clear(workspaceId: string): void {
    this.store.delete(workspaceId);
  }

  listWorkspaces(): string[] {
    return Array.from(this.store.keys());
  }
}
