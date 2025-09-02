# Implementation Plan: Adopt PocketFlow SDK for Orchestration

Objective: Replace the custom prompt composition in Mira’s orchestration layer with the official PocketFlow SDK while keeping our architecture swap‑able and MemoryStore responsibilities intact.

Summary of changes
- Introduced a formal ChainEngine interface (services/llm/ChainEngine.ts) that abstracts orchestration engines.
- Implemented PocketFlowChainEngine (services/llm/PocketFlowChainEngine.ts) using import PocketFlow from 'pocketflow'.
  - pf.chat({ systemPrompt, messages, role, tools, context }) -> returns { text }.
  - pf.plan({ title, summary, goals, context }) -> returns { outline }.
- Updated LLMOrchestrator (services/orchestrator/LLMOrchestrator.ts) to:
  - Manage memory via MemoryStore as before.
  - Depend on ChainEngine and lazily instantiate PocketFlowChainEngine by default.
- Added TypeScript module stub (types/pocketflow.d.ts) and Jest mapping to a mock for deterministic tests.
- Added tests for PocketFlowChainEngine delegation and updated orchestrator tests to inject a fake engine.

Rationale
- PocketFlow SDK provides a minimal, expressive, and dependency‑light orchestration API for chat and planning.
- Keeping ChainEngine preserves the ability to swap PocketFlow with alternatives (e.g., LangChain) later without touching the orchestrator.

Steps
1) Abstraction
   - Create ChainEngine with runChatChain and runPlanningChain signatures.
2) Engine implementation
   - Implement PocketFlowChainEngine that maps our internal types to PocketFlow’s API.
3) Orchestrator integration
   - Use ChainEngine in LLMOrchestrator; continue persisting chat history in MemoryStore.
4) Type and test setup
   - Provide a TS module declaration for 'pocketflow' and a Jest moduleNameMapper to a mock.
5) Tests
   - Unit tests ensuring PocketFlowChainEngine calls pf.chat/pf.plan with correct parameters and returns normalized results.
   - Orchestrator tests inject a fake engine to keep tests deterministic and independent of SDK internals.

Future work
- Add PocketFlow tool invocations when real tools are wired.
- Consider streaming support via PocketFlow if/when required by UI.
- Optional: Introduce a LangChain engine adapter conforming to ChainEngine to validate swap‑ability.
