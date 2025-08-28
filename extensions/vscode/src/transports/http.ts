import axios, { AxiosInstance, AxiosRequestHeaders } from 'axios';

export interface HttpTransportOptions {
  endpoint: string;
  headers?: AxiosRequestHeaders;
  timeoutMs?: number;
  axiosInstance?: AxiosInstance;
}

export type MessageHandler = (msg: string) => void;

/**
 * A simple JSON-RPC over HTTP transport. Each send() performs a POST and
 * forwards the response payload to the registered onMessage handler.
 */
export class HttpJSONRPCTransport {
  private handler: MessageHandler | null = null;
  private axios: AxiosInstance;

  constructor(private readonly options: HttpTransportOptions) {
    this.axios = options.axiosInstance ?? axios.create({
      timeout: options.timeoutMs ?? 15000,
      headers: options.headers,
    });
  }

  onMessage(cb: MessageHandler): void {
    this.handler = cb;
  }

  async send(json: string): Promise<void> {
    const { endpoint } = this.options;
    // Try to extract id so we can relay structured errors if HTTP fails
    let id: number | string | null = null;
    try {
      const obj = JSON.parse(json);
      if (obj && (typeof obj.id === 'number' || typeof obj.id === 'string')) id = obj.id;
    } catch {
      // ignore
    }

    try {
      const res = await this.axios.post(endpoint, json, {
        headers: { 'Content-Type': 'application/json', ...(this.options.headers || {}) },
        transformRequest: [(data) => data], // send as-is
      });
      const payload = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      if (this.handler) this.handler(payload);
    } catch (err: any) {
      // Relay as JSON-RPC error so client can reject the pending promise
      if (this.handler) {
        const errorPayload = {
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: err?.message || 'HTTP transport error', data: { status: err?.response?.status } },
        };
        this.handler(JSON.stringify(errorPayload));
      }
    }
  }
}
