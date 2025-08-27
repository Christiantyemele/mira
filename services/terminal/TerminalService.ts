import { EventEmitter } from 'events';

export type TerminalStatus = 'running' | 'exited' | 'killed';
export type TerminalStream = 'stdout' | 'stderr';

export interface TerminalSession {
  session_id: string;
  name?: string | null;
  cwd?: string | null;
  pid?: number | null;
  started_at: string; // ISO-8601
  ended_at?: string | null;
  status: TerminalStatus;
}

export interface TerminalLogEntry {
  ts: string; // ISO-8601
  stream: TerminalStream;
  data: string;
}

export interface CreateSessionOptions {
  name?: string | null;
  cwd?: string | null;
  env?: Record<string, string>;
  command?: string | null;
  args?: string[];
  shell?: boolean;
  cols?: number | null;
  rows?: number | null;
}

export interface TerminalSessionStoreLike {
  create(session: TerminalSession): void;
  update(session_id: string, patch: Partial<TerminalSession>): void;
  get(session_id: string): TerminalSession | undefined;
  list(): TerminalSession[];
  appendLog(session_id: string, entry: TerminalLogEntry): void;
  readLogs(session_id: string, since_ts?: string | null, limit_lines?: number | null): TerminalLogEntry[];
}

export class TerminalService {
  private events = new EventEmitter();

  constructor(private readonly store: TerminalSessionStoreLike) {}

  on(event: 'stream', listener: (payload: { session_id: string; stream: TerminalStream; data: string; timestamp: string }) => void): () => void;
  on(event: 'exit', listener: (payload: { session_id: string; code: number | null; signal: string | null; duration_ms: number }) => void): () => void;
  on(event: 'stream' | 'exit', listener: (...args: any[]) => void) {
    this.events.on(event, listener as any);
    return () => this.events.off(event, listener as any);
  }

  listSessions(): TerminalSession[] {
    return this.store.list();
  }

  createSession(opts: CreateSessionOptions = {}): TerminalSession {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: TerminalSession = {
      session_id: id,
      name: opts.name ?? null ?? undefined,
      cwd: opts.cwd ?? null ?? undefined,
      pid: null, // stub: no actual process
      started_at: new Date().toISOString(),
      ended_at: null,
      status: 'running',
    };
    this.store.create(session);
    // emit a stub welcome message
    this.append(session.session_id, 'stdout', `[${session.name ?? 'session'} created]`);
    return session;
  }

  write(session_id: string, data: string): number {
    // Stub: just echo to stdout
    this.append(session_id, 'stdout', data);
    return data.length;
  }

  resize(_session_id: string, _cols: number, _rows: number): boolean {
    // Stub: accept any resize
    return true;
  }

  kill(session_id: string, signal: 'SIGTERM' | 'SIGKILL' | 'SIGHUP' | null = 'SIGTERM'): boolean {
    const s = this.store.get(session_id);
    if (!s) return false;
    const ended = new Date();
    this.store.update(session_id, { status: signal === 'SIGKILL' ? 'killed' : 'exited', ended_at: ended.toISOString() });
    const duration_ms = ended.getTime() - new Date(s.started_at).getTime();
    this.events.emit('exit', { session_id, code: signal === 'SIGKILL' ? null : 0, signal, duration_ms });
    this.append(session_id, 'stderr', `[session ${signal === 'SIGKILL' ? 'killed' : 'exited'}]`);
    return true;
  }

  attach(session_id: string): boolean {
    const s = this.store.get(session_id);
    return !!s && s.status === 'running';
  }

  readLogs(session_id: string, since_ts?: string | null, limit_lines?: number | null): TerminalLogEntry[] {
    return this.store.readLogs(session_id, since_ts ?? null, limit_lines ?? null);
  }

  private append(session_id: string, stream: TerminalStream, data: string) {
    const ts = new Date().toISOString();
    const entry: TerminalLogEntry = { ts, stream, data };
    this.store.appendLog(session_id, entry);
    this.events.emit('stream', { session_id, stream, data, timestamp: ts });
  }
}
