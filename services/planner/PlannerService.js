"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerService = void 0;
const events_1 = require("events");
class PlannerService {
    constructor(store) {
        this.store = store;
        this.events = new events_1.EventEmitter();
    }
    on(event, listener) {
        this.events.on(event, listener);
        return () => this.events.off(event, listener);
    }
    createPlan(title, user_request, context, assignee_default = 'Developer') {
        const now = new Date().toISOString();
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        // Minimal LLM-free stub plan
        const tasks = [
            { id: id + '-1', description: `Understand request: ${user_request}`, status: 'todo', assignee_role: 'Architect' },
            { id: id + '-2', description: 'Implement minimal changes', status: 'todo', assignee_role: assignee_default ?? 'Developer' },
            { id: id + '-3', description: 'Run tests and verify in terminal', status: 'todo', assignee_role: 'Debugger' }
        ];
        const plan = { id, title, description: context ?? undefined, tasks, created_at: now, updated_at: now };
        this.store.createPlan(plan);
        this.events.emit('plan_updated', { plan });
        return plan;
    }
    getPlan(plan_id) {
        return this.store.getPlan(plan_id);
    }
    updateTask(plan_id, task_id, patch) {
        const plan = this.store.getPlan(plan_id);
        if (!plan)
            return undefined;
        const existing = plan.tasks.find(t => t.id === task_id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...patch };
        this.store.upsertTask(plan_id, updated);
        const now = new Date().toISOString();
        this.store.updatePlan(plan_id, { updated_at: now });
        this.events.emit('task_updated', { plan_id, task: updated, updated_at: now });
        return updated;
    }
    listPlans() {
        return this.store.listPlans();
    }
}
exports.PlannerService = PlannerService;
//# sourceMappingURL=PlannerService.js.map