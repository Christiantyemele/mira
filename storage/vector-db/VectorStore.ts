export interface VectorItemMeta {
  path?: string;
  line_start?: number | null;
  line_end?: number | null;
  lang?: string | null;
  tags?: string[];
  [key: string]: unknown;
}

export interface VectorItem {
  id: string;
  vector: number[];
  metadata: VectorItemMeta;
  namespace?: string | null;
}

export interface SearchFilter {
  path_prefix?: string | null;
  tags?: string[];
}

export interface SearchRequest {
  embedding: number[];
  top_k?: number;
  namespace?: string | null;
  filter?: SearchFilter;
  include_vectors?: boolean;
}

export interface SearchMatch extends Omit<VectorItem, 'vector'> {
  score: number;
  vector?: number[];
}

export class VectorStore {
  private data: VectorItem[] = [];

  upsert(items: VectorItem[]) {
    for (const item of items) {
      const idx = this.data.findIndex((d) => d.id === item.id);
      if (idx >= 0) this.data[idx] = item;
      else this.data.push(item);
    }
  }

  deleteByNamespace(namespace: string | null | undefined) {
    this.data = this.data.filter((d) => (d.namespace ?? null) !== (namespace ?? null));
  }

  search(req: SearchRequest): SearchMatch[] {
    const topK = req.top_k ?? 5;
    const namespace = req.namespace ?? null;
    const candidates = this.data.filter((d) => (d.namespace ?? null) === namespace);
    const filtered = candidates.filter((d) => {
      if (req.filter?.path_prefix && d.metadata.path && !d.metadata.path.startsWith(req.filter.path_prefix)) {
        return false;
      }
      if (req.filter?.tags && req.filter.tags.length) {
        const t = d.metadata.tags ?? [];
        if (!t.some((x) => req.filter!.tags!.includes(x))) return false;
      }
      return true;
    });

    const scored = filtered.map((d) => ({
      id: d.id,
      metadata: d.metadata,
      namespace: d.namespace,
      score: cosineSimilarity(req.embedding, d.vector),
      vector: req.include_vectors ? d.vector : undefined,
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
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
