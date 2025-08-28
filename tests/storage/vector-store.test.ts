import { VectorStore } from '../../storage/vector-db/VectorStore';

describe('VectorStore (in-memory)', () => {
  it('returns the closest id as the top search result', async () => {
    const store = new VectorStore();
    const ns = 'test';

    await store.upsert(ns, 'A', [1, 0], { label: 'A' });
    await store.upsert(ns, 'B', [0, 1], { label: 'B' });
    await store.upsert(ns, 'C', [0.9, 0.1], { label: 'C' });

    const query = [0.95, 0.05];
    const results = await store.search(ns, query, 3);

    expect(results.length).toBe(3);
    expect(results[0].id).toBe('A'); // A is closest to the query for cosine similarity
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
  });
});
