export interface Transport {
  send(json: string): void | Promise<void>;
  onMessage(cb: (msg: string) => void): void;
}

export interface ToolMeta {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  tags?: string[];
  enabled?: boolean;
}

export type JSONRPCID = number | string;

interface PendingEntry {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class MCPClient {
  private nextId = 1;
  private readonly pending = new Map<number, PendingEntry>();

  constructor(private readonly transport: Transport) {
    this.transport.onMessage(this.handleIncoming);
  }

  request(method: string, params?: any): Promise<any> {
    const id = this.nextId++;
    const payload: any = { jsonrpc: '2.0', method, id };
    if (params !== undefined) payload.params = params;
    const json = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      Promise.resolve(this.transport.send(json)).catch((err) => {
        // If sending fails, cleanup and reject
        this.pending.delete(id);
        reject(err);
      });
    });
  }

  notify(method: string, params?: any): void | Promise<void> {
    const payload: any = { jsonrpc: '2.0', method };
    if (params !== undefined) payload.params = params;
    return this.transport.send(JSON.stringify(payload));
  }

  private handleIncoming = (msg: string) => {
    let data: any;
    try {
      data = JSON.parse(msg);
    } catch {
      // Ignore non-JSON input
      return;
    }

    const messages = Array.isArray(data) ? data : [data];
    for (const m of messages) {
      if (!m || typeof m !== 'object') continue;
      if (m.id === undefined || m.id === null) continue; // notifications or invalid
      const idNum = typeof m.id === 'number' ? m.id : Number(m.id);
      const entry = this.pending.get(idNum);
      if (!entry) continue;
      this.pending.delete(idNum);

      if (Object.prototype.hasOwnProperty.call(m, 'result')) {
        entry.resolve(m.result);
      } else if (Object.prototype.hasOwnProperty.call(m, 'error')) {
        const err = m.error || {};
        const e = new Error(err.message || 'JSON-RPC Error');
        (e as any).code = err.code;
        (e as any).data = err.data;
        entry.reject(e);
      } else {
        entry.reject(new Error('Invalid JSON-RPC response'));
      }
    }
  };
}
