"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteLLMClient = void 0;
class LiteLLMClient {
    constructor(config) {
        this.cfg = config;
        this.dim = Math.max(4, Math.floor(config.embedDim ?? 16));
    }
    async embed(text) {
        if (this.cfg.mode === 'api') {
            throw new Error('LiteLLMClient api mode not implemented');
        }
        // Deterministic mock embedding: hash characters into a fixed-length vector
        const vec = new Array(this.dim).fill(0);
        // Simple rolling hash accumulation per dimension
        let acc = 2166136261 >>> 0; // FNV offset basis as a seed
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i) & 0xffff;
            acc ^= c;
            // 32-bit FNV-1a prime multiplication
            acc = Math.imul(acc, 16777619) >>> 0;
            const idx = i % this.dim;
            // Mix in the accumulator and char code deterministically
            vec[idx] = (vec[idx] + ((acc ^ (c * (i + 1))) >>> 0)) >>> 0;
        }
        // Normalize to small numbers for stability
        const maxVal = vec.reduce((m, v) => (v > m ? v : m), 0) || 1;
        for (let i = 0; i < this.dim; i++) {
            vec[i] = vec[i] / maxVal; // in [0,1]
        }
        return vec;
    }
    async chat(prompt, _opts) {
        if (this.cfg.mode === 'api') {
            throw new Error('LiteLLMClient api mode not implemented');
        }
        return { text: `MOCK RESPONSE: ${prompt}` };
    }
    async rerank(items, query) {
        if (!Array.isArray(items)) {
            throw new Error('rerank expects an array of strings');
        }
        const queryVec = await this.embed(query);
        const scored = await Promise.all(items.map(async (item) => {
            const v = await this.embed(item);
            const s = cosineSimilarity(queryVec, v);
            return { item, score: s };
        }));
        // Sort by score descending, stable for equal scores by original index
        scored.sort((a, b) => b.score - a.score);
        return scored.map((s) => s.item);
    }
}
exports.LiteLLMClient = LiteLLMClient;
function cosineSimilarity(a, b) {
    const n = Math.min(a.length, b.length);
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < n; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    if (!isFinite(denom) || denom === 0)
        return 0;
    return dot / denom;
}
//# sourceMappingURL=LiteLLMClient.js.map