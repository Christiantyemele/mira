import { Plan, Task, TaskStoreLike } from '../../services/planner/PlannerService';

export class TaskStore implements TaskStoreLike {
  private plans = new Map<string, Plan>();

  createPlan(plan: Plan): void {
    this.plans.set(plan.id, JSON.parse(JSON.stringify(plan)) as Plan);
  }

  updatePlan(plan_id: string, patch: Partial<Plan>): void {
    const p = this.plans.get(plan_id);
    if (!p) return;
    const updated: Plan = { ...p, ...patch } as Plan;
    this.plans.set(plan_id, updated);
  }

  getPlan(plan_id: string): Plan | undefined {
    const p = this.plans.get(plan_id);
    return p ? (JSON.parse(JSON.stringify(p)) as Plan) : undefined;
  }

  listPlans(): Plan[] {
    return Array.from(this.plans.values()).map((p) => JSON.parse(JSON.stringify(p)) as Plan);
  }

  upsertTask(plan_id: string, task: Task): void {
    const p = this.plans.get(plan_id);
    if (!p) return;
    const idx = p.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) p.tasks[idx] = task; else p.tasks.push(task);
    this.plans.set(plan_id, { ...p });
  }
}
