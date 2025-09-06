# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- The root TypeScript config (`tsconfig.json`) **excludes** all files in `extensions/`; the VSCode extension is built and typechecked separately using its own config at `extensions/vscode/tsconfig.json`.
- The `build` script runs two TypeScript builds: one for the root (services, storage, etc.), and one for the extension.
- Jest is configured to mock `vscode`, `pocketflow`, and `langchain` using files in `tests/mocks/`. These mocks are required for tests to run.
- Only files in `services/` and `storage/` are included in test coverage metrics.
- Some services (e.g., orchestrator and LLM engines) use dynamic `require()` to select implementations at runtime. This can affect testability and bundling.
- There is **no linting or formatting config** in the repo; code style is not enforced by tooling.
- No standard lint or format scripts are present; run `npm run build` and `npm run test` for compilation and tests.
- To run a single test file: use `npx jest path/to/file.test.ts`.
- The extension and core services are **decoupled** at the build and typecheck level; changes in one may not be caught by the other's build.
- When adding new dependencies for the extension, ensure they are compatible with VSCode's extension host environment.
