import { watch, promises as fsp, statSync } from 'fs';
import { resolve, join } from 'path';

export type Indexer = {
  upsertChunk: (namespace: string, id: string, vector: number[], metadata: any) => Promise<void>;
};

export interface FileWatcherOptions {
  namespace?: string;
  debounceMs?: number;
  chunkSize?: number; // max characters per chunk
  embedFn?: (text: string) => Promise<number[]> | number[];
  fileFilter?: (fullPath: string) => boolean;
}

export class FileWatcher {
  private readonly root: string;
  private readonly indexer: Indexer;
  private readonly namespace: string;
  private readonly debounceMs: number;
  private readonly chunkSize: number;
  private readonly embedFn?: (text: string) => Promise<number[]> | number[];
  private readonly fileFilter?: (fullPath: string) => boolean;

  private watchers: Array<ReturnType<typeof watch>> = [];
  private timer: NodeJS.Timeout | null = null;
  private queue = new Set<string>();

  constructor(rootPath: string, indexer: Indexer, options: FileWatcherOptions = {}) {
    this.root = resolve(rootPath);
    this.indexer = indexer;
    this.namespace = options.namespace ?? 'default';
    this.debounceMs = options.debounceMs ?? 200;
    this.chunkSize = Math.max(1, Math.floor(options.chunkSize ?? 800));
    this.embedFn = options.embedFn;
    this.fileFilter = options.fileFilter;
  }

  start() {
    this.stop();
    const tryWatch = (recursive: boolean) =>
      watch(this.root, { recursive }, (eventType, filename) => {
        const full = filename ? resolve(this.root, filename.toString()) : this.root;
        // optionally filter out directories or unwanted files
        if (this.fileFilter && !this.fileFilter(full)) return;
        // Queue file if it exists and is a file
        try {
          const st = statSync(full);
          if (!st.isFile()) return;
        } catch {
          // might be a deletion; ignore
          return;
        }
        this.queue.add(full);
        this.scheduleFlush();
      });

    try {
      this.watchers.push(tryWatch(true));
    } catch {
      // Fallback for platforms that do not support recursive watching
      try {
        this.watchers.push(tryWatch(false));
      } catch {
        // ignore if cannot watch
      }
    }
  }

  stop() {
    for (const w of this.watchers) {
      try { w.close(); } catch { /* noop */ }
    }
    this.watchers = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue.clear();
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private async flush() {
    const files = Array.from(this.queue.values());
    this.queue.clear();
    for (const file of files) {
      await this.processFile(file);
    }
  }

  private async processFile(filePath: string) {
    let content: string;
    try {
      content = await fsp.readFile(filePath, 'utf8');
    } catch {
      return; // ignore unreadable files
    }
    const chunks = this.chunkText(content, this.chunkSize);
    const totalChunks = chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      const { text, start, end, startLine, endLine } = chunks[i];
      const id = `${filePath}#${i}`;
      const vector = await this.getVector(text);
      const metadata = {
        path: filePath,
        start,
        end,
        startLine,
        endLine,
        chunkIndex: i,
        totalChunks,
        length: text.length,
      };
      await this.indexer.upsertChunk(this.namespace, id, vector, metadata);
    }
  }

  private async getVector(text: string): Promise<number[]> {
    if (this.embedFn) {
      const v = this.embedFn(text);
      return Array.isArray(v) ? v : await v;
    }
    // default deterministic tiny embedding (8-dim)
    const dim = 8;
    const vec = new Array(dim).fill(0);
    let acc = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i) & 0xffff;
      acc ^= c;
      acc = Math.imul(acc, 16777619) >>> 0;
      const idx = i % dim;
      vec[idx] = (vec[idx] + ((acc ^ (c * (i + 1))) >>> 0)) >>> 0;
    }
    const maxVal = vec.reduce((m, v) => (v > m ? v : m), 0) || 1;
    for (let i = 0; i < dim; i++) vec[i] = vec[i] / maxVal;
    return vec;
  }

  private chunkText(text: string, maxLen: number): Array<{ text: string; start: number; end: number; startLine: number; endLine: number; }> {
    const chunks: Array<{ text: string; start: number; end: number; startLine: number; endLine: number; }> = [];
    const lineStarts = this.computeLineStarts(text);
    const total = text.length;
    let start = 0;
    while (start < total) {
      const end = Math.min(start + maxLen, total);
      const slice = text.slice(start, end);
      const startLine = this.lineForIndex(lineStarts, start);
      const endLine = this.lineForIndex(lineStarts, end - 1);
      chunks.push({ text: slice, start, end, startLine, endLine });
      start = end;
    }
    return chunks;
  }

  private computeLineStarts(text: string): number[] {
    const starts: number[] = [0]; // line 1 starts at index 0
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') starts.push(i + 1);
    }
    return starts;
  }

  // Convert character index to 1-based line number using binary search over lineStarts
  private lineForIndex(lineStarts: number[], index: number): number {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const val = lineStarts[mid];
      const next = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Infinity;
      if (index >= val && index < next) return mid + 1; // 1-based
      if (index < val) hi = mid - 1; else lo = mid + 1;
    }
    return lineStarts.length; // fallback
  }
}
