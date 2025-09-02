# Mira Orchestration Architecture (PocketFlow SDK)

Overview
Mira now uses the official PocketFlow SDK to orchestrate LLM interactions for chat, planning, and tool-oriented chains while keeping the system modular and easily swappable.

Key Components
- LLMOrchestrator (services/orchestrator/LLMOrchestrator.ts)
  - Public interface unchanged.
  - Manages session-scoped history via MemoryStore.
  - Delegates all orchestration logic to a pluggable ChainEngine.
- ChainEngine interface (services/llm/ChainEngine.ts)
  - Defines runChatChain and runPlanningChain.
  - Keeps orchestration engine swappable (PocketFlow today, could be LangChain later).
- PocketFlowChainEngine (services/llm/PocketFlowChainEngine.ts)
  - Uses import PocketFlow from 'pocketflow'.
  - Chat: pf.chat({ systemPrompt, messages, role, tools, context }) -> { text }.
  - Planning: pf.plan({ title, summary, goals, context }) -> { outline }.

Memory Handling
- MemoryStore persists ChatTurn objects for each sessionId.
- Orchestrator stores the user message, retrieves the history, calls the engine, then stores the assistant message—ensuring an accurate conversational transcript.

Benefits of the PocketFlow SDK
- Minimalistic and zero-bloat LLM framework.
- Expressive chaining primitives for chat, planning, and tools without heavy abstractions.
- Clean separation between orchestration (engine) and application logic (orchestrator/memory), enabling future swaps with minimal surface changes.
- Deterministic tests via SDK mocking and a thin adapter layer.

Swap-ability
- The ChainEngine interface abstracts PocketFlow specifics. A future LangChainChainEngine can implement the same interface with no changes to LLMOrchestrator.

Testing Strategy
- The PocketFlow SDK is mocked in tests (Jest moduleNameMapper) for deterministic behavior.
- Engine tests verify parameter mapping and delegation to pf.chat/pf.plan.
- Orchestrator tests inject a fake ChainEngine to validate memory persistence and message flow.

References
- PocketFlow official documentation: see the PocketFlow NPM package and docs for API details on chat, plan, tools, and memory patterns.
