# Mira Implementation Plan

This document outlines module responsibilities, data flow, API contracts, deployment setup, role behaviors, and recommended next steps to bootstrap the system.

---

## 1) Module Responsibilities

### A. extensions/
- vscode/
  - src/extension.ts
    - Activation lifecycle (activate/deactivate)
    - Register commands: connect, executePrompt, listTools, openChatView, processPrompt
    - StatusBar item for connection/status
    - Chat view provider (webview) mounting the chat UI
    - Connection to MCP client (services/mcp) via transports
  - src/chat/
    - Webview UI bindings (message list, input box, role selector, tool/task surface)
    - Message serialization bridge between webview and extension host
    - Rendering assistant actions (edits, file diffs, tool outputs)
  - src/transports/
    - stdio: spawn MCP server binaries and speak JSON‑RPC over stdio
    - http: JSON‑RPC over HTTP(S) with auth headers and timeouts
  - package.json
    - Contributes commands, views, activationEvents, configuration

Responsibilities
- UX shell: commands, status, chat view
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

Responsibilities
- Core domain logic decoupled from extension host
- Orchestrate flows (watch → embed → store → retrieve → answer)

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

Responsibilities
- Persistence of structure (graph), meaning (vectors), and dialogue (memory)

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
8. Tool execution (optional)
   - services/mcp invokes tool via JSON‑RPC (e.g., files/read, exec/run); results streamed
9. Edit application (optional)
   - services/chat proposes patches; user reviews; extension applies edits
10. Memory update
   - storage/memory appends turn, citations, and outcomes for future grounding

---

## 3) API Contracts (summary)

- Transport: JSON‑RPC 2.0 over stdio or HTTP(S)
- Core methods (drafts):
  - tools/list → discover available tools and metadata
  - files/read, files/write → project file I/O with safeguards
  - exec/run → run shell commands with policy limits
  - vector/search → semantic retrieval
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

1. Repo scaffolding
   - Create extensions/vscode skeleton (activation, commands, chat webview stub)
   - Add services/ (mcp client, chat service, llm wrapper, tool registry)
   - Add storage/ adapters with in-memory mocks for early testing
2. MCP client
   - Implement JSON‑RPC client with stdio and http transports; retries and timeouts
   - Implement tools/list + files/read/write + exec/run + vector/search
3. Indexing pipeline
   - File watcher (debounced) → embed via LiteLLM → vector-db in-memory placeholder
4. Chat loop
   - Role templates → prompt assembly → LLM call → stream to chat UI
5. Config + secrets
   - config/mira.json + .mira workspace metadata; document env vars
6. Docker
   - docker-compose for Neo4j + selected vector DB + default MCP servers
7. CI
   - Linting, typecheck, and unit tests for services; basic integration test for tools/list

Non-goals for v0
- Full AST server; focus on line/paragraph chunking first
- Complex auth flows; rely on tokens/keys set via env or settings

---

Appendices
- System overview: docs/01-system-architecture.md
- Plugin architecture: docs/02-plugin-architecture.md
- API Contracts: docs/api-contract.md
- Roles: docs/roles.md
