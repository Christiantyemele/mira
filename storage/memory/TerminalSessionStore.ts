import { TerminalLogEntry, TerminalSession, TerminalSessionStoreLike } from '../../services/terminal/TerminalService';

export class TerminalSessionStore implements TerminalSessionStoreLike {
  private sessions = new Map<string, TerminalSession>();
  private logs = new Map<string, TerminalLogEntry[]>();

  create(session: TerminalSession): void {
    this.sessions.set(session.session_id, session);
    if (!this.logs.has(session.session_id)) this.logs.set(session.session_id, []);
  }

  update(session_id: string, patch: Partial<TerminalSession>): void {
    const current = this.sessions.get(session_id);
    if (!current) return;
    this.sessions.set(session_id, { ...current, ...patch });
  }

  get(session_id: string): TerminalSession | undefined {
    return this.sessions.get(session_id);
  }

  list(): TerminalSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => a.started_at.localeCompare(b.started_at));
  }

  appendLog(session_id: string, entry: TerminalLogEntry): void {
    const arr = this.logs.get(session_id) ?? [];
    arr.push(entry);
    this.logs.set(session_id, arr);
  }

  readLogs(session_id: string, since_ts: string | null = null, limit_lines: number | null = null): TerminalLogEntry[] {
    let arr = this.logs.get(session_id) ?? [];
    if (since_ts) {
      arr = arr.filter(e => e.ts > since_ts);
    }
    if (limit_lines && limit_lines > 0) {
      arr = arr.slice(-limit_lines);
    }
    return [...arr];
  }
}
