import { MCPClient, type Transport } from '../../services/mcp/Client';

class MockTransport implements Transport {
  public lastSent?: string;
  private cb: ((msg: string) => void) | null = null;

  send(json: string): void {
    this.lastSent = json;
  }

  onMessage(cb: (msg: string) => void): void {
    this.cb = cb;
  }

  emit(msg: string) {
    if (this.cb) this.cb(msg);
  }
}

describe('MCPClient JSON-RPC', () => {
  it('request sends proper JSON-RPC and resolves upon response', async () => {
    const tx = new MockTransport();
    const client = new MCPClient(tx);

    const p = client.request('tools/list', { limit: 10 });

    expect(tx.lastSent).toBeDefined();
    const payload = JSON.parse(tx.lastSent!);
    expect(payload.jsonrpc).toBe('2.0');
    expect(payload.method).toBe('tools/list');
    expect(typeof payload.id).toBe('number');
    expect(payload.params).toEqual({ limit: 10 });

    const response = { jsonrpc: '2.0', id: payload.id, result: { tools: [{ name: 'files/read' }] } };
    tx.emit(JSON.stringify(response));

    const res = await p;
    expect(res).toEqual({ tools: [{ name: 'files/read' }] });
  });
});
