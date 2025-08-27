# HIGH LEVEL OVERVIEW
## Components:

- VS Code Extension Host
  -  Activation (src/extension.ts)
  - Commands (connect, executePrompt, listTools, openChatView, processPrompt)
  - StatusBar integration
  - Minimal webview provider for side panel entry point
- MCP Client(Mira)
  -  Transports
     -  stdio: child_process spawn of MCP binary with JSON-RPC over stdio
     - Standard: (HTTP JSON-RPC): axios-based JSON-RPC
  - Tool discovery on connect (tools/list, toolsets/list, etc.)
  -  Semantic indexing trigger after discovery
- Configuration Loader
    - External config discovery (env, home, workspace)
    - YAML/JSON parsing with warnings on failure
  
- LLM & Embedding providers through LITELLM
- Chat UI
    -  Webview for chat with toggles and message formatting
- Parsers and Presentation
    - PromptRewriter for parsing and rewriting prompts
    -  Presentation for rendering results
- Default MCP SERVERS (Loaded and started in docker from Config)

  | MCP Servers                                     |
  |-------------------------------------------------|
  | 🐳 Filesystem MCP server (read/write)           |
  | 🐳 Git MCP server                               |
  | 🐳 Web MCP server                               |
  | 🐳 Infrastructure web search (PRO subscription) |
  | 🐳 AST Filesystem                               |
  | 🐳 exec/shell-server                            |
|   | 🐳 Vector DB (Milvus)                           |
    | 🐳 reranker |
- Services (Built on extension client)
    - MCP Service
    - Chat Service
    - Tool Service
    - File Watcher Service
    - Cloud Service
    - User Service
    - LLM Service

# LifeCycle And Data Flow
1. Activation
    - extension(assistant) registers commands and a minimal webview
2. Connect
    - Read merged Config
    - Start MCP Servers
    - Start LLM Service
    - Start Chat Service
    - Start Tool Service
    - Start File Watcher Service
    - Start Cloud Service
    - Start User Service
    - 
3. Execute Prompt
    - PromptRewriter parses and rewrites prompt

# Performance
- Embedding batched and limited: semantic index re-built only when toolset changes or stale.
- Axios timeouts set to 10s prevent indefinite hangs.
- lightweight chat webview avoids heavy frameworks 

# Threading and Events
- Multithreaded
-  Async/Await
-  Eventing

# Key Directories
- src/
- src/commands/
- src/services/
- src/providers/
- src/views/
- src/utils/
- src/types/
- src/config/
- src/tools/

# Architectural Principles
- External config is the source of truth when present; UI settings are a fallback only.
- Tokens and keys are never logged in full; masking is mandatory.
- Transport selection should be explicit, resilient, and secure by default.

# DIAGRAM
![diagram](../images/architecture.drawio.xml)