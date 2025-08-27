import { EventEmitter } from 'events';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  assignee_role: string;
  parent_id?: string | null;
  children?: string[];
}

export interface Plan {
  id: string;
  title: string;
  description?: string;
  tasks: Task[];
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
}

export interface TaskStoreLike {
  createPlan(plan: Plan): void;
  updatePlan(plan_id: string, patch: Partial<Plan>): void;
  getPlan(plan_id: string): Plan | undefined;
  listPlans(): Plan[];
  upsertTask(plan_id: string, task: Task): void;
}

export class PlannerService {
  private events = new EventEmitter();

  constructor(private readonly store: TaskStoreLike) {}

  on(event: 'task_updated', listener: (payload: { plan_id: string; task: Task; updated_at: string }) => void): () => void;
  on(event: 'plan_updated', listener: (payload: { plan: Plan }) => void): () => void;
  on(event: 'task_updated' | 'plan_updated', listener: (...args: any[]) => void) {
    this.events.on(event, listener as any);
    return () => this.events.off(event, listener as any);
  }

  createPlan(title: string, user_request: string, context?: string | null, assignee_default: string | null = 'Developer'): Plan {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Minimal LLM-free stub plan
    const tasks: Task[] = [
      { id: id + '-1', description: `Understand request: ${user_request}`, status: 'todo', assignee_role: 'Architect' },
      { id: id + '-2', description: 'Implement minimal changes', status: 'todo', assignee_role: assignee_default ?? 'Developer' },
      { id: id + '-3', description: 'Run tests and verify in terminal', status: 'todo', assignee_role: 'Debugger' }
    ];
    const plan: Plan = { id, title, description: context ?? undefined, tasks, created_at: now, updated_at: now };
    this.store.createPlan(plan);
    this.events.emit('plan_updated', { plan });
    return plan;
  }

  getPlan(plan_id: string): Plan | undefined {
    return this.store.getPlan(plan_id);
  }

  updateTask(plan_id: string, task_id: string, patch: Partial<Pick<Task, 'description' | 'status' | 'assignee_role'>>): Task | undefined {
    const plan = this.store.getPlan(plan_id);
    if (!plan) return undefined;
    const existing = plan.tasks.find(t => t.id === task_id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...patch } as Task;
    this.store.upsertTask(plan_id, updated);
    const now = new Date().toISOString();
    this.store.updatePlan(plan_id, { updated_at: now });
    this.events.emit('task_updated', { plan_id, task: updated, updated_at: now });
    return updated;
  }

  listPlans(): Plan[] {
    return this.store.listPlans();
  }
}
