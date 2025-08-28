import { spawn, ChildProcessWithoutNullStreams, SpawnOptions } from 'child_process';
import * as readline from 'readline';
import { Readable, Writable } from 'stream';

export type MessageHandler = (msg: string) => void;

export interface StdioTransportOptions {
  command?: string;
  args?: string[];
  spawnOptions?: SpawnOptions;
  // For tests or embedding, allow injecting streams instead of spawning a process
  stdin?: Writable;
  stdout?: Readable;
}

/**
 * A simple stdio JSON line transport. Each JSON string sent is written
 * with a trailing newline. Incoming stdout is split by line and forwarded
 * to a registered onMessage callback.
 */
export class StdioJSONRPCTransport {
  private handler: MessageHandler | null = null;
  private child?: ChildProcessWithoutNullStreams;
  private writer: Writable;

  constructor(opts: StdioTransportOptions = {}) {
    if (opts.stdin && opts.stdout) {
      this.writer = opts.stdin;
      this.setupReader(opts.stdout);
    } else {
      const cmd = opts.command ?? process.execPath; // node binary by default
      const args = opts.args ?? [];
      const c = spawn(cmd, args, { stdio: 'pipe', ...(opts.spawnOptions || {}) }) as ChildProcessWithoutNullStreams;
      this.child = c;
      this.writer = c.stdin;
      this.setupReader(c.stdout);
    }
  }

  onMessage(cb: MessageHandler): void {
    this.handler = cb;
  }

  async send(json: string): Promise<void> {
    // Ensure newline-delimited JSON
    const line = json.endsWith('\n') ? json : json + '\n';
    await new Promise<void>((resolve, reject) => {
      this.writer.write(line, (err) => (err ? reject(err) : resolve()));
    });
  }

  private setupReader(stream: Readable) {
    const rl = readline.createInterface({ input: stream });
    rl.on('line', (line) => {
      if (this.handler) this.handler(line);
    });
  }
}
