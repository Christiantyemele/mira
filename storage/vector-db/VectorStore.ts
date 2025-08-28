/**
 * VectorStore: Simple in-memory vector store with cosine similarity.
 *
 * This implementation is intended for development and tests. For production,
 * you can replace the internals with a real vector database:
 * - Milvus: upsert/delete via insert/delete and search via collection.search
 * - PostgreSQL + pgvector: store vectors in a table with a vector column and
 *   use ORDER BY embedding <#> query_vector for cosine distance
 *
 * To integrate, keep the same public methods and route calls to your backend.
 */

export type VectorMetadata = any;

export interface VectorResult {
  id: string;
  score: number; // cosine similarity [0..1]
  metadata: VectorMetadata;
}

interface VectorRecord {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
}

export class VectorStore {
  // namespace -> array of records
  private readonly data = new Map<string, VectorRecord[]>();

  /**
   * Insert or update a vector by id within a namespace.
   */
  async upsert(namespace: string, id: string, vector: number[], metadata: VectorMetadata): Promise<void> {
    const key = namespace ?? '';
    const bucket = this.data.get(key) ?? [];
    const idx = bucket.findIndex((r) => r.id === id);
    const rec: VectorRecord = { id, vector: vector.slice(), metadata };
    if (idx >= 0) bucket[idx] = rec; else bucket.push(rec);
    this.data.set(key, bucket);
  }

  /**
   * Delete an id within a namespace.
   */
  async delete(namespace: string, id: string): Promise<void> {
    const key = namespace ?? '';
    const bucket = this.data.get(key);
    if (!bucket) return;
    const filtered = bucket.filter((r) => r.id !== id);
    this.data.set(key, filtered);
  }

  /**
   * Search topK most similar vectors (cosine similarity) within a namespace.
   */
  async search(namespace: string, vector: number[], topK: number): Promise<VectorResult[]> {
    const key = namespace ?? '';
    const bucket = this.data.get(key) ?? [];
    const scored = bucket.map((r) => ({
      id: r.id,
      metadata: r.metadata,
      score: cosineSimilarity(vector, r.vector),
    }));
    scored.sort((a, b) => b.score - a.score);
    if (topK <= 0) return [];
    return scored.slice(0, Math.min(topK, scored.length));
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}
