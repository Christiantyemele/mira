import { promises as fsp } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileWatcher, Indexer } from '../../../services/file-watcher/FileWatcher';

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitUntil(cond: () => boolean, timeoutMs = 4000, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return;
    await delay(intervalMs);
  }
  throw new Error('waitUntil: timeout');
}

describe('FileWatcher', () => {
  jest.setTimeout(15000);

  let tmp: string;

  beforeEach(async () => {
    tmp = await fsp.mkdtemp(join(tmpdir(), 'mira-fsw-'));
  });

  afterEach(async () => {
    try { await fsp.rm(tmp, { recursive: true, force: true }); } catch {}
  });

  it('watches files, chunks content, and calls indexer.upsertChunk with metadata', async () => {
    const filePath = join(tmp, 'test.txt');
    const indexer: Indexer = {
      upsertChunk: jest.fn().mockResolvedValue(undefined),
    };

    const chunkSize = 10;
    const watcher = new FileWatcher(tmp, indexer, {
      namespace: 'ns',
      debounceMs: 75,
      chunkSize,
      // deterministic small embedding for test: just length
      embedFn: (t: string) => [t.length],
    });

    watcher.start();

    const content = '0123456789ABCDEFGHIJ'; // length 20, should produce 2 chunks of 10
    await fsp.writeFile(filePath, content, 'utf8');

    const expectedChunks = Math.ceil(content.length / chunkSize);

    await waitUntil(() => (indexer.upsertChunk as jest.Mock).mock.calls.length >= expectedChunks, 5000, 50);

    const calls = (indexer.upsertChunk as jest.Mock).mock.calls as Array<[string, string, number[], any]>;
    expect(calls.length).toBe(expectedChunks);

    for (let i = 0; i < expectedChunks; i++) {
      const [ns, id, vector, metadata] = calls[i];
      expect(ns).toBe('ns');
      expect(id).toBe(`${filePath}#${i}`);
      expect(Array.isArray(vector)).toBe(true);
      expect(vector).toEqual([Math.min(chunkSize, content.length - i * chunkSize)]);

      expect(metadata).toBeDefined();
      expect(metadata.path).toBe(filePath);
      expect(metadata.chunkIndex).toBe(i);
      expect(metadata.totalChunks).toBe(expectedChunks);
      expect(typeof metadata.start).toBe('number');
      expect(typeof metadata.end).toBe('number');
      expect(metadata.start).toBe(i * chunkSize);
      expect(metadata.end).toBe(Math.min((i + 1) * chunkSize, content.length));
      expect(typeof metadata.startLine).toBe('number');
      expect(typeof metadata.endLine).toBe('number');
      expect(metadata.endLine).toBeGreaterThanOrEqual(metadata.startLine);
    }

    watcher.stop();
  });
});
