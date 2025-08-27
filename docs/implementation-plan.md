# Mira Implementation Plan

This document outlines module responsibilities, data flow, API contracts, deployment setup, role behaviors, and recommended next steps to bootstrap the system.

---

## 1) Module Responsibilities

### A. extensions/
- vscode/
  - src/extension.ts
    - Activation lifecycle (activate/deactivate)
    - Register commands: connect, executePrompt, listTools, openChatView, processPrompt
    - Register commands: openTerminalPanel, terminal.newSession, terminal.killSession, terminal.reattachSession
    - Register commands: openPlannerView, planner.createPlan, planner.updateTask
    - StatusBar item for connection/status
    - Chat view provider (webview) mounting the chat UI
    - Terminal Sessions panel provider (webview) for session list/logs/stdin
    - Planner view provider (webview) for task plans and live updates
    - Connection to MCP client (services/mcp) via transports
  - src/chat/
    - Webview UI bindings (message list, input box, role selector, tool/task surface)
    - Message serialization bridge between webview and extension host
    - Rendering assistant actions (edits, file diffs, tool outputs)
  - src/terminal/
    - TerminalViewProvider.ts: webview with session list, stdout/stderr log console, stdin box
    - Supports start/kill/restart/reattach and resize; secure rendering of logs
  - src/planner/
    - PlannerViewProvider.ts: webview to display plans, tasks, subtasks with status and assignee role
    - Inline task status toggling and editing (description, assignee)
  - src/transports/
    - stdio: spawn MCP server binaries and speak JSON‑RPC over stdio
    - http: JSON‑RPC over HTTP(S) with auth headers and timeouts
  - package.json
    - Contributes commands, views (mira.chat, mira.terminal, mira.planner), activationEvents, configuration

Responsibilities
- UX shell: commands, status, chat view, terminal sessions panel, planner view
- Bridge: VS Code APIs -> services/*
- Transport selection & connection lifecycle

### B. services/
- mcp/
  - Client orchestration for JSON‑RPC (request/response, notifications)
  - Tool discovery (tools/list), tool metadata cache
  - Capability negotiation per server
- chat/
  - Conversation state, turn management, role selection
  - Edit application (apply file patches with user confirmation)
  - RAG routing and prompt construction
  - Planner integration (reference tasks, update statuses on completion)
- tools/
  - Registry for local/remote tools; metadata, auth, quotas
  - Discovery from MCP servers; enable/disable per workspace
- file-watcher/
  - FS + Git change monitoring (debounced)
  - Emits events to embeddings indexer and graph updater
- llm/
  - LiteLLM client wrapper (completion, chat, embedding, rerank)
  - Prompt templating and safety filters
- cloud/
  - GitHub/Drive integrations (list/read/write with user consent)
- terminal/
  - TerminalService: manages session lifecycle (create, write stdin, resize, kill, reattach)
  - Security policy: cwd allowlist, env scrubbing, command validation, resource limits
  - Stream aggregation and log retention; emits stdout/stderr and exit events
  - Bridges to MCP terminal server via JSON‑RPC terminals/* methods
- planner/
  - PlannerService: generates and maintains plans/tasks (id, description, status, assignee role)
  - LLM-driven plan generation from user requests; updates via chat actions and file events
  - Emits task/plan events for UI; integrates with memory for context recall

Responsibilities
- Core domain logic decoupled from extension host
- Orchestrate flows (watch → embed → store → retrieve → answer)
- Manage terminal sessions as first-class resources
- Maintain task plans with real-time updates to UI and persistence

### C. storage/
- neo4j/
  - Graph schema (File, Symbol, Commit, Tool, Relation)
  - Cypher queries (upsert nodes/edges, dependency graph, impact radius)
- vector-db/
  - Embeddings store (Milvus/Weaviate/pgvector)
  - CRUD: upsert, search, delete by file or namespace
- memory/
  - Project chat history per workspace
  - Message store with metadata (role, tools used, citations)
  - Task plans store (Plan, Task, Subtask) with lightweight in-memory adapter
  - Terminal session metadata/log index (session id, name, cwd, start/end times, last lines)

Responsibilities
- Persistence of structure (graph), meaning (vectors), dialogue (memory), tasks (planner), and terminal session metadata/logs

---

## 2) End-to-End Data Flow

1. Change detection
   - file-watcher observes FS and Git; batches events.
2. Parsing + feature extraction
   - Optional AST/line chunking by language; compute checksums.
3. Embedding
   - services/llm embeds chunks via LiteLLM; attach metadata (path, lang, commit, symbols).
4. Storage
   - storage/vector-db upserts vectors per chunk
   - storage/neo4j updates file/symbol nodes and relations
5. Retrieval during chat
   - User sends prompt via extensions/chat → services/chat
   - Reranker selects top contexts from vector-db (and graph neighborhood)
6. Prompt assembly
   - Role template + user query + selected contexts + tool specs
7. LLM generation
   - services/llm calls chat/completions; streaming to UI; tool-use when needed via MCP
8. Task planning (optional)
   - services/planner generates a plan from the user request and context (LLM-driven)
   - storage/memory persists the plan and tasks; extensions/planner renders tasks and subscribes to updates
9. Terminal execution (optional)
   - User or chat triggers a terminal session via services/terminal → MCP terminals/*
   - Stdout/stderr streamed as notifications to services/terminal → extensions/terminal view
   - Logs are retained; stdin can be sent from UI; sessions can be killed/reattached
10. Tool execution (optional)
   - services/mcp invokes tool via JSON‑RPC (e.g., files/read, exec/run); results streamed
11. Edit application (optional)
   - services/chat proposes patches; user reviews; extension applies edits
   - On successful edits/tests, planner tasks are advanced (e.g., in_progress → done)
12. Memory update
   - storage/memory appends turn, citations, outcomes; update task states and terminal session metadata

---

## 3) API Contracts (summary)

- Transport: JSON‑RPC 2.0 over stdio or HTTP(S)
- Core methods (drafts):
  - tools/list → discover available tools and metadata
  - files/read, files/write → project file I/O with safeguards
  - exec/run → run shell commands with policy limits
  - vector/search → semantic retrieval
  - terminals/* → interactive terminal session management (create/write/resize/kill/attach/list/read_logs)
  - planner/* → LLM-driven task plans and updates (create_plan/get_plan/update_task/list_plans)
- See docs/api-contract.md for complete request/response schemas, examples, and error model.

---

## 4) Deployment Setup

### Local (developer machine)
- Prereqs: Node 18+, VS Code, Neo4j (desktop or docker), Vector DB (Milvus/Weaviate/pgvector), Python 3.10+ (if needed by servers)
- Steps
  1. Install VS Code extension in dev mode (F5) from extensions/vscode
  2. Configure config/mira.json with MCP endpoints and keys
  3. Start required MCP servers (filesystem, exec, git, web) locally or via docker-compose
  4. Ensure Neo4j and Vector DB are reachable; set env vars in VS Code settings or config

### Docker MCP servers
- A docker/mcp-servers directory will host Dockerfiles and compose files for default servers:
  - filesystem, git, web, exec, AST, vector DB, reranker
- Typical startup: `docker compose up -d`
- Extension connects via http or stdio per server config

Security & ops
- Do not run exec/run with elevated privileges
- Limit filesystem scopes via allowlists
- Mask secrets in logs; rotate keys periodically

---

## 5) Role Behavior (templates overview)

- Architect: systems thinking, constraints, trade-offs, clear diagrams and interfaces
- Developer: minimal viable changes, tests first when feasible, diffs and reasoning
- Data Scientist: rigorous methodology, EDA → modeling → evaluation → reporting
- Data Engineer: scalable pipelines, idempotent, schema contracts, observability
- Documentation Engineer: clear user-oriented docs, consistent style, examples
- Debugger: hypothesis → reproduce → isolate → minimal fix → verify; caution with side effects
- Project Manager: goals, milestones, risks, dependencies, status updates

See docs/roles.md for full prompt templates.

---

## 6) Next Steps (bootstrap tasks)

1. Repo scaffolding ✓
2. MCP client ✓
3. Indexing pipeline ✓
4. Chat loop ✓
5. Config + secrets ✓
6. Docker ✓
7. CI ✓
8. Terminal Sessions (new)
   - Add services/terminal TerminalService with in-memory session management and event emitters.
   - Add storage/memory/TerminalSessionStore to persist session metadata and logs.
   - Extend VS Code extension with TerminalViewProvider and commands: open panel, new/kill/reattach.
   - Wire minimal UI to send stdin and display streamed logs (stubbed).
9. Task Planner (new)
   - Add services/planner PlannerService with plan generation (LLM stub) and task updates.
   - Add storage/memory/TaskStore to persist plans and tasks with statuses and assignees.
   - Extend VS Code extension with PlannerViewProvider and commands: open planner, create plan, update task.
   - Integrate planner with chat service events to auto-advance tasks when edits/tests succeed.
10. API integration
   - Implement MCP terminals/* and planner/* calls in services/mcp Client (as needed when servers exist).
   - Add notification handling for stream and plan/task updates.
11. Security & Policy
   - Enforce cwd allowlists, env scrubbing, and timeouts for terminals.
   - Add role-based defaults for task assignment and status transitions.
12. Tests
   - Unit tests for TerminalService and PlannerService (session lifecycle; task updates).
   - Webview provider smoke tests (if applicable).

Non-goals for v0
- Full AST server; focus on line/paragraph chunking first
- Complex auth flows; rely on tokens/keys set via env or settings

---

Appendices
- System overview: docs/01-system-architecture.md
- Plugin architecture: docs/02-plugin-architecture.md
- API Contracts: docs/api-contract.md
- Roles: docs/roles.md
