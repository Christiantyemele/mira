"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
class MemoryStore {
    constructor() {
        this.store = new Map();
    }
    append(workspaceId, turn) {
        const arr = this.store.get(workspaceId) ?? [];
        arr.push(turn);
        this.store.set(workspaceId, arr);
    }
    getHistory(workspaceId) {
        return [...(this.store.get(workspaceId) ?? [])];
    }
    clear(workspaceId) {
        this.store.delete(workspaceId);
    }
    listWorkspaces() {
        return Array.from(this.store.keys());
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=MemoryStore.js.map