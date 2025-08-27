import { MCPClient, type Transport } from '../../services/mcp/Client';

describe('MCPClient', () => {
  class FakeTransport implements Transport {
    public last?: { method: string; params?: Record<string, unknown> };
    async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
      this.last = { method, params };
      switch (method) {
        case 'tools/list':
          // @ts-expect-error - simplifying test data shape
          return { tools: [{ name: 'files/read', description: 'Read a file' }] } as T;
        case 'exec/run':
          // @ts-expect-error - simplifying test data shape
          return { exit_code: 0, stdout: 'ok', stderr: '', duration_ms: 1, timed_out: false } as T;
        default:
          return {} as T;
      }
    }
  }

  it('calls tools/list and returns tools', async () => {
    const tx = new FakeTransport();
    const client = new MCPClient(tx);
    const res = await client.listTools({ limit: 10 });
    expect(tx.last?.method).toBe('tools/list');
    expect(res.tools[0].name).toBe('files/read');
  });

  it('calls exec/run and returns result', async () => {
    const tx = new FakeTransport();
    const client = new MCPClient(tx);
    const res = await client.execRun({ command: 'echo', args: ['ok'] });
    expect(tx.last?.method).toBe('exec/run');
    // @ts-expect-error test convenience access
    expect(res.exit_code).toBe(0);
  });
});
