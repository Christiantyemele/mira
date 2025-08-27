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

export interface TerminalsCreateParams {
  name?: string | null;
  cwd?: string | null;
  env?: Record<string, string>;
  command?: string | null;
  args?: string[];
  shell?: boolean;
  cols?: number | null;
  rows?: number | null;
  attach?: boolean;
}
export interface TerminalsCreateResult {
  session_id: string;
  pid?: number | null;
  name?: string | null;
  cwd?: string | null;
  started_at: string;
}
export interface TerminalsWriteParams { session_id: string; data: string }
export interface TerminalsWriteResult { bytes: number }
export interface TerminalsResizeParams { session_id: string; cols: number; rows: number }
export interface TerminalsOkResult { ok: boolean }
export interface TerminalsKillParams { session_id: string; signal?: 'SIGTERM' | 'SIGKILL' | 'SIGHUP' | null }
export interface TerminalsAttachParams { session_id: string }
export interface TerminalListItem { session_id: string; name?: string | null; cwd?: string | null; started_at: string; ended_at?: string | null; status: 'running' | 'exited' | 'killed' }
export interface TerminalsListResult { sessions: TerminalListItem[] }
export interface TerminalsReadLogsParams { session_id: string; since_ts?: string | null; limit_lines?: number | null }
export interface TerminalsReadLogsResult { logs: Array<{ ts: string; stream: 'stdout' | 'stderr'; data: string }>; }

export interface PlannerCreatePlanParams { title: string; user_request: string; context?: string | null; assignee_default?: string | null }
export interface PlannerCreatePlanResult { plan: Record<string, unknown> }
export interface PlannerGetPlanParams { plan_id: string }
export interface PlannerGetPlanResult { plan: Record<string, unknown> }
export interface PlannerUpdateTaskParams { plan_id: string; task_id: string; patch: { description?: string | null; status?: 'todo' | 'in_progress' | 'done' | 'blocked' | null; assignee_role?: string | null } }
export interface PlannerUpdateTaskResult { task: Record<string, unknown>; plan_id: string }
export interface PlannerListPlansParams { cursor?: string | null; limit?: number }
export interface PlannerListPlansResult { plans: Array<Record<string, unknown>>; next_cursor?: string | null }

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

  // terminals/* wrappers
  async terminalsCreate(params: TerminalsCreateParams): Promise<TerminalsCreateResult> {
    return this.transport.request('terminals/create', params);
  }
  async terminalsWrite(params: TerminalsWriteParams): Promise<TerminalsWriteResult> {
    return this.transport.request('terminals/write', params);
  }
  async terminalsResize(params: TerminalsResizeParams): Promise<TerminalsOkResult> {
    return this.transport.request('terminals/resize', params);
  }
  async terminalsKill(params: TerminalsKillParams): Promise<TerminalsOkResult> {
    return this.transport.request('terminals/kill', params);
  }
  async terminalsAttach(params: TerminalsAttachParams): Promise<TerminalsOkResult> {
    return this.transport.request('terminals/attach', params);
  }
  async terminalsList(): Promise<TerminalsListResult> {
    return this.transport.request('terminals/list', {});
  }
  async terminalsReadLogs(params: TerminalsReadLogsParams): Promise<TerminalsReadLogsResult> {
    return this.transport.request('terminals/read_logs', params);
  }

  // planner/* wrappers
  async plannerCreatePlan(params: PlannerCreatePlanParams): Promise<PlannerCreatePlanResult> {
    return this.transport.request('planner/create_plan', params);
  }
  async plannerGetPlan(params: PlannerGetPlanParams): Promise<PlannerGetPlanResult> {
    return this.transport.request('planner/get_plan', params);
  }
  async plannerUpdateTask(params: PlannerUpdateTaskParams): Promise<PlannerUpdateTaskResult> {
    return this.transport.request('planner/update_task', params);
  }
  async plannerListPlans(params?: PlannerListPlansParams): Promise<PlannerListPlansResult> {
    return this.transport.request('planner/list_plans', params ?? {});
  }
}
