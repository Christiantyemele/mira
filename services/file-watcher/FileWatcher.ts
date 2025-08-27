import { EventEmitter } from 'events';
import { watch } from 'fs';
import { resolve } from 'path';

export interface FileWatcherOptions {
  debounceMs?: number;
}

export type FileEvent = {
  type: 'change' | 'rename';
  path: string;
  ts: number;
};

export class FileWatcher {
  private readonly events = new EventEmitter();
  private watchers: Array<ReturnType<typeof watch>> = [];
  private queue = new Map<string, FileEvent>();
  private timer: NodeJS.Timeout | null = null;
  private readonly debounceMs: number;

  constructor(opts: FileWatcherOptions = {}) {
    this.debounceMs = opts.debounceMs ?? 300;
  }

  on(event: 'batch', listener: (batch: FileEvent[]) => void) {
    this.events.on(event, listener);
    return () => this.events.off(event, listener);
  }

  watchPaths(paths: string[]) {
    this.dispose();
    for (const p of paths) {
      const abs = resolve(p);
      try {
        const w = watch(abs, { recursive: true }, (eventType, filename) => {
          const full = filename ? resolve(abs, filename.toString()) : abs;
          const ev: FileEvent = { type: eventType === 'rename' ? 'rename' : 'change', path: full, ts: Date.now() };
          this.queue.set(full, ev);
          this.scheduleFlush();
        });
        this.watchers.push(w);
      } catch (e) {
        // ignore invalid paths
      }
    }
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush() {
    const items = Array.from(this.queue.values()).sort((a, b) => a.ts - b.ts);
    this.queue.clear();
    if (items.length) this.events.emit('batch', items);
  }

  dispose() {
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
}
