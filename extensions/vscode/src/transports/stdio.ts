export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: number | string;
}

export class StdioTransport {
  // Placeholder: a real implementation would spawn a child process and speak JSON-RPC over stdio.
  constructor(private readonly command: string, private readonly args: string[] = []) {}

  async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    // For bootstrap, just throw to indicate not wired yet.
    throw new Error(`StdioTransport not implemented. Tried to call ${method} with ${JSON.stringify(params ?? {})}`);
  }
}
