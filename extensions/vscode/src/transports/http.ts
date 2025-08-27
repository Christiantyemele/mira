export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: number | string;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface HttpTransportOptions {
  endpoint: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

// Declare minimal globals to avoid requiring DOM lib in TS config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const fetch: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const AbortController: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestInit = any;

export class HttpTransport {
  constructor(private readonly opts: HttpTransportOptions) {}

  async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    // Minimal stub using fetch; in production handle retries and timeouts.
    const body: JsonRpcRequest = { jsonrpc: '2.0', method, params: params ?? {}, id: Date.now() };
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timeout = this.opts.timeoutMs ?? 10000;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : undefined;
    try {
      const res = await fetch(this.opts.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.opts.headers ?? {}) },
        body: JSON.stringify(body),
        signal: controller?.signal,
      } as RequestInit);
      const json = (await res.json()) as JsonRpcResponse<T>;
      if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
      return json.result as T;
    } catch (e) {
      // For stub, rethrow error; caller should handle.
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
