import { LiteLLMClient } from '../../../services/llm/LiteLLMClient';

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

describe('LiteLLMClient (mock mode)', () => {
  it('embed returns fixed-length deterministic vectors within [0,1]', async () => {
    const client = new LiteLLMClient({ mode: 'mock', embedDim: 8 });
    const text = 'hello world';
    const v1 = await client.embed(text);
    const v2 = await client.embed(text);

    expect(Array.isArray(v1)).toBe(true);
    expect(v1.length).toBe(8);
    expect(v2.length).toBe(8);
    expect(v1).toEqual(v2); // deterministic for same input

    for (const val of v1) {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('chat returns the mock prefixed text', async () => {
    const client = new LiteLLMClient({ mode: 'mock' });
    const prompt = 'Say hi';
    const res = await client.chat(prompt);
    expect(res).toEqual({ text: `MOCK RESPONSE: ${prompt}` });
  });

  it('rerank returns items sorted by similarity to the query', async () => {
    const client = new LiteLLMClient({ mode: 'mock', embedDim: 12 });
    const items = ['apple pie', 'banana bread', 'apple tart', 'grape'];
    const query = 'apple';

    const queryVec = await client.embed(query);
    const withScores = await Promise.all(
      items.map(async (it) => ({ it, score: cosine(await client.embed(it), queryVec) }))
    );
    const expected = withScores
      .sort((a, b) => b.score - a.score)
      .map((s) => s.it);

    const ranked = await client.rerank(items, query);
    expect(ranked).toEqual(expected);
  });
});
