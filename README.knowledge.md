# Mira AI Assistant — Knowledge Graph README

## 📌 Entities

### 1. Assistant

* **Name**: Mira
* **Type**: AI Development Assistant
* **Purpose**: Help developers with coding, debugging, feature implementation, and project management.
* **Core Technologies**:

    * LLMs (Large Language Models)
    * Model Context Protocol (MCP)
    * Neo4j Graph Database
    * Vector Database

---

### 2. Capabilities

| Capability             | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| Development Assistance | Fix bugs, implement new features, scaffold projects       |
| Efficient Token Use    | Manages LLM tokens for optimized cost/performance         |
| Chat + Edit            | Conversational guidance + direct code editing             |
| External Integrations  | Connects to GitHub, Google Drive, Cloud services          |
| Transparent Operations | Exposes tasks and tools for user control                  |
| Role Switching         | Behaves differently depending on selected role            |
| Context Management     | Reads files, user input, and special dirs (e.g., `.mira`) |
| Persistent Memory      | Stores chat history per project                           |

---

### 3. Roles

Mira supports **7 roles**, each changing its behavior:

| Role                   | Function                                     |
| ---------------------- | -------------------------------------------- |
| Architect              | Designs high-level system architecture       |
| Developer              | Writes, edits, and optimizes code            |
| Data Scientist         | Builds and analyzes ML/AI workflows          |
| Data Engineer          | Handles data pipelines and transformations   |
| Documentation Engineer | Generates and maintains documentation        |
| Debugger               | Finds and fixes bugs                         |
| Project Manager        | Organizes tasks, dependencies, and timelines |

---

### 4. Data & Storage

| Component       | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| Neo4j Graph DB  | Stores project relations, dependencies, and semantic graph structure      |
| Vector Database | Stores embeddings of project files and chat for semantic search/retrieval |
| Project Memory  | Chat history stored per project                                           |
| Special Dirs    | `.mira` directory holds assistant-specific configurations & metadata      |

---

### 5. Workflow (Relationships)

```json
{
  "Assistant": {
    "interacts_with": ["User"],
    "has_capabilities": ["Development Assistance", "Chat + Edit", "Role Switching", "External Integrations"],
    "uses": ["LLM", "MCP", "Neo4j Graph Database", "Vector Database"],
    "stores": ["Project Memory", "File Embeddings", "Relations in Graph DB"],
    "recognizes": ["Special Directories (.mira)"],
    "can_impersonate": ["Architect", "Developer", "Data Scientist", "Data Engineer", "Documentation Engineer", "Debugger", "Project Manager"]
  }
}
```

---

### 6. Example Use Cases

| Use Case               | Example Action                                                  |
| ---------------------- | --------------------------------------------------------------- |
| Project Creation       | Scaffold new project with configs and boilerplate               |
| Feature Implementation | Add new functions using stored context and role-based reasoning |
| Debugging              | Detect and fix code bugs automatically                          |
| Documentation          | Generate or update project documentation                        |
| Project Management     | Track tasks, dependencies, and system-level design              |
| Integration            | Sync with GitHub repo, fetch project files from Google Drive    |

---

✅ With this structure, Mira’s README becomes a **knowledge graph + scaffold** that an LLM can:

1. Parse as JSON for reasoning.
2. Traverse relationships (Assistant → Roles → Capabilities).
3. Generate structured answers (e.g., "What role is best for debugging?" → Debugger).

---

### 7. Scope and Non-Goals

- In Scope (MVP)
  - Single-user, single-project operation with local or self-hosted backends.
  - Context ingestion from file system and recent VCS history.
  - Basic vector retrieval for code/text with lightweight reranking.
  - Role-based responses with visible tool usage and user-approval for edits.
- Non-Goals (MVP)
  - Multi-tenant SaaS control plane, enterprise SSO, and advanced compliance.
  - Real-time collaborative editing and multi-agent orchestration.
  - Full auto-commit workflows without human approval.
  - Broad provider abstraction beyond a single chosen embedding/model stack.

### 8. Glossary

- Assistant: The agent orchestrating tools and generating responses.
- Role: Behavior profile (e.g., Developer, Debugger) that shapes outputs and tool access.
- Capability: Discrete function the Assistant can perform (e.g., Chat + Edit).
- Tool: An executable operation accessible to the Assistant (e.g., file read, git diff).
- Service: A long-lived component providing functionality (e.g., Chat Service).
- Project Memory: Per-project conversational and task state retained over time.
- Chunk: A segment of text/code prepared for embedding and retrieval.
- Embedding: Vector representation used for semantic search.
- Reranker: Model that reorders retrieved candidates for relevance.
- Context Pipeline: Steps that prepare, index, and fetch grounding information for prompts.

### 9. Data Schemas (Initial Contracts)

- Graph (Neo4j-like) — Nodes and Relationships
  - Nodes
    - Project: { id: string, name: string, rootPath: string, createdAt: iso8601 }
    - File: { id: string, projectId: string, path: string, lang: string, hash: string, size: number }
    - Service: { id: string, name: string, kind: string, version?: string }
    - Tool: { id: string, name: string, version?: string }
    - Role: { id: string, name: string, description?: string }
    - Capability: { id: string, name: string, description?: string }
  - Relationships (directional)
    - (Project)-[:CONTAINS]->(File)
    - (Assistant)-[:USES]->(Tool|Service)
    - (Assistant)-[:HAS_CAPABILITY]->(Capability)
    - (Assistant)-[:CAN_IMPERSONATE]->(Role)
    - (File)-[:DEPENDS_ON]->(File)
    - (File)-[:BELONGS_TO]->(Project)
- Vector Store (Documents Collection)
  - Document fields
    - id: string
    - projectId: string
    - path: string
    - commitSha?: string
    - chunkIndex: number
    - text: string
    - tags?: string[]
    - roleHints?: string[]
    - embedding: float[1536]  // dimension can be adjusted via config
    - createdAt: iso8601
  - Index params
    - metric: cosine
    - efConstruction: 200
    - M: 16
- Project Memory
  - Key: { projectId: string, sessionId: string, turnId: string }
  - Record: { role: string, content: string, metadata?: object, createdAt: iso8601, expiresAt?: iso8601 }
  - Retention: default TTL 30 days; GC weekly.

### 10. Special Directory: .mira (Convention)

- .mira/config.yaml — Global settings (model, embedding.dim, vector params, tool timeouts).
- .mira/roles/*.md — Role definitions and output templates.
- .mira/tools/*.json — Tool descriptors (name, args schema, permissions).
- .mira/memory/ — Local project memory store (if not externalized).
- .mira/embeddings/ — Optional local cache metadata (no raw vectors if remote).
- .mira/policies.yaml — Prompt rewriting, safety, and token budgeting policies.
- Git hygiene: exclude secrets and large cache files; store only portable configs.

### 11. Role Operating Guides (MVP)

- Common output rules
  - Always show assumptions and cite retrieved sources (file path + chunk index).
  - Prefer step-by-step plans and minimal diffs; request confirmation before writes.
  - Conform to structured headers: Context, Assumptions, Plan, Actions, Result.
- Role quick specs
  - Architect: mission = high-level design; tools = read files, list services; deliverables = ADRs, diagrams (text), interface contracts.
  - Developer: mission = code changes; tools = read/write files, git diff; deliverables = patch plans and minimal edits.
  - Debugger: mission = fault isolation; tools = read files, run diagnostics (safe); deliverables = repro steps, root cause, fix plan.
  - Documentation Engineer: mission = docs quality; tools = read files; deliverables = updated docs with changelog.
  - Data Engineer: mission = data pipelines; tools = read config, propose schemas; deliverables = pipeline specs and tests.
  - Data Scientist: mission = modeling workflows; tools = read data stubs; deliverables = experiment plans, metrics to track.
  - Project Manager: mission = coordination; tools = none required; deliverables = task breakdowns, timelines, acceptance criteria.

### 12. Tool Contract (Standardized)

- Request
  - { name: string, args: object, timeoutMs?: number, correlationId?: string, requestId?: string }
- Response
  - { ok: true, result: object, correlationId?: string } |
    { ok: false, error: { code: string, message: string, details?: object }, correlationId?: string }
- Error codes
  - E_TIMEOUT, E_BAD_REQUEST, E_UNAUTHORIZED, E_NOT_FOUND, E_CONFLICT, E_INTERNAL
- Conventions
  - Idempotency by requestId; retries with exponential backoff; streaming optional via events.

### 13. Context Assembly and Retrieval Policy (MVP)

- Ingestion
  - Collect file tree and recent VCS changes; normalize paths; compute content hash.
- Chunking
  - Target 300 tokens per chunk; 50-token overlap; language-aware splitting when possible.
- Deduplication
  - Hash-based skip of identical chunks; prefer latest commit when conflicts occur.
- Embedding
  - Batch size 32; backpressure on failures; record model and dimension in metadata.
- Storage
  - One document per chunk with path, commitSha, chunkIndex.
- Retrieval
  - topK = 12; directory diversity heuristic; optional rerank top50 -> top8.
- Assembly
  - Include citations; cap total context tokens; include last modified files if not already present.

### 14. Security and Privacy (Baseline)

- Secrets via environment or OS keychain; never checked into version control.
- Redact tokens and secrets in logs; partial masking for IDs.
- Permission prompts for destructive actions (writes, shell, network).
- Optional PII redaction pass for user-provided content.
- Audit trail: record tool calls (name, args hash, duration, outcome).

### 15. Observability

- Structured logs (JSON): { ts, level, svc, role, correlationId, event, details }.
- Metrics: counters for tool calls, embeddings, tokens; histograms for latency; gauges for queue depth.
- Tracing: propagate correlationId across tool calls; add spans for retrieval and generation.
- Health checks: liveness/readiness per service; exponential backoff on external failures.

### 16. Testing Strategy

- Unit tests: chunker, retriever, prompt rewriting, tool adapters.
- Integration tests: tool contracts with fake or sandboxed backends.
- E2E flows: “bug fix”, “feature addition”, and “doc update” happy paths.
- Golden tests: stable prompts and expected outputs; snapshot diffs allowed.
- Non-functional: load test embedding/index on medium-sized repos; chaos tests for timeouts.

### 17. Milestones and Acceptance Criteria

- Milestone 1: Context ingestion + embeddings + simple retrieval
  - Accept: index created; retrieval returns cited chunks; latency p95 < 2s on small repo.
- Milestone 2: Chat + Edit with approval
  - Accept: diff proposal shown; user approves; files updated with audit record.
- Milestone 3: VCS awareness
  - Accept: retrieval includes recent changes; commits surfaced with paths.
- Milestone 4: Role framework v1
  - Accept: role-specific templates and tool allowlist enforced.

### 18. Contribution Guidelines (Short)

- Propose changes via issues with scope, acceptance criteria, and risks.
- For PRs: include tests for new behavior and update relevant docs.
- Follow standardized output headers and citation rules.
- Avoid introducing new secrets/config keys without documenting them under .mira/config.yaml.
