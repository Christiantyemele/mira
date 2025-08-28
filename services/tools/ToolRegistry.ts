import type { ToolMeta } from '../mcp/Client';

export class ToolRegistry {
  private tools = new Map<string, ToolMeta>();

  register(tool: ToolMeta) {
    this.tools.set(tool.name, tool);
  }

  registerMany(tools: ToolMeta[]) {
    for (const t of tools) this.register(t);
  }

  list(filter?: { enabled?: boolean; tags?: string[] }): ToolMeta[] {
    let arr = Array.from(this.tools.values());
    if (filter?.enabled !== undefined) {
      arr = arr.filter((t) => (t.enabled ?? true) === filter.enabled);
    }
    if (filter?.tags && filter.tags.length) {
      arr = arr.filter((t) => t.tags?.some((tag: string) => filter.tags!.includes(tag)));
    }
    return arr;
  }

  get(name: string): ToolMeta | undefined {
    return this.tools.get(name);
  }

  enable(name: string) {
    const t = this.tools.get(name);
    if (t) {
      t.enabled = true;
      this.tools.set(name, t);
    }
  }

  disable(name: string) {
    const t = this.tools.get(name);
    if (t) {
      t.enabled = false;
      this.tools.set(name, t);
    }
  }

  clear() {
    this.tools.clear();
  }
}
