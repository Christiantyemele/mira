export interface Transport {
  request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
}

export interface ToolMeta {
  name: string;
  title?: string;
  description: string;
  version?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown> | null;
  tags?: string[];
  auth_required?: boolean;
  enabled?: boolean;
  server?: { id: string; transport: 'stdio' | 'http'; endpoint?: string | null };
}

export interface ListToolsResult {
  tools: ToolMeta[];
  next_cursor?: string | null;
}

export interface ReadFileParams {
  path: string;
  encoding?: 'utf-8' | 'base64';
  max_bytes?: number;
  etag?: string | null;
  offset?: number;
  length?: number;
}

export interface WriteFileParams {
  path: string;
  content?: string | null;
  content_base64?: string | null;
  encoding?: 'utf-8' | 'base64';
  create?: boolean;
  overwrite?: boolean;
  etag?: string | null;
  mode?: number | null;
  mkdirs?: boolean;
}

export interface ExecRunParams {
  command: string;
  args?: string[];
  cwd?: string | null;
  env?: Record<string, string>;
  timeout_ms?: number;
  stdin?: string | null;
  shell?: boolean;
  stream?: boolean;
}

export interface VectorSearchParams {
  query?: string | null;
  embedding?: number[] | null;
  top_k?: number;
  namespace?: string | null;
  filter?: Record<string, unknown>;
  include_vectors?: boolean;
  rerank?: boolean;
}

export class MCPClient {
  constructor(private readonly transport: Transport) {}

  async listTools(params?: { filter?: Record<string, unknown>; cursor?: string | null; limit?: number }): Promise<ListToolsResult> {
    return this.transport.request<ListToolsResult>('tools/list', params);
    }

  async readFile(params: ReadFileParams): Promise<Record<string, unknown>> {
    return this.transport.request('files/read', params);
  }

  async writeFile(params: WriteFileParams): Promise<Record<string, unknown>> {
    return this.transport.request('files/write', params);
  }

  async execRun(params: ExecRunParams): Promise<Record<string, unknown>> {
    return this.transport.request('exec/run', params);
  }

  async vectorSearch(params: VectorSearchParams): Promise<Record<string, unknown>> {
    return this.transport.request('vector/search', params);
  }
}
