# Mira AI Assistant

## Overview

Mira is an AI-powered development assistant designed to help with coding, debugging, and project management tasks. It combines:

* **Artificial Intelligence (LLMs)**
* **Model Context Protocol (MCP)**
* **Neo4j Graph Database**

The goal is to give developers the **best solutions with minimal effort**, while providing **transparency, control, and flexibility** in how AI is applied to their projects.

---

## Core Capabilities

* **Development Assistance** → Fix bugs, implement features, and generate new project scaffolds.
* **Efficient Token Management** → Optimizes LLM usage for cost-effectiveness and performance.
* **Chat + Edit Functionality** → Users can converse with Mira or let it directly edit code.
* **Role-Based Behavior** → Mira can impersonate different roles to adapt its behavior and outputs.
* **External Integration** → Connects with platforms like GitHub, Google Drive, and other cloud services.
* **Transparency & Control** → Exposes internal tasks and tools so users can guide the assistant directly.

---

## Roles

Mira supports **7 specialized roles**, which influence how it interacts with the user:

1. **Architect**
2. **Developer**
3. **Data Scientist**
4. **Data Engineer**
5. **Documentation Engineer**
6. **Debugger**
7. **Project Manager**

Users can switch roles depending on the task at hand.

---

## How It Works (Architecture)

1. **Project Context**

    * Mira collects project details via file reading, user input, and external integrations.
    * Context can be explicitly added by the user or implicitly inferred from files.

2. **Graph + Vector Storage**

    * **Neo4j Graph Database** → Stores project relations and dependencies.
    * **Vector Database** → Stores semantic embeddings of project data for retrieval.

3. **Task Execution**

    * Mira interprets user commands.
    * It selects the appropriate tools, roles, and models.
    * Executes tasks while exposing operations transparently.

4. **Special Directories**

    * Mira can recognize and manage specific directories (e.g., `.mira`) that hold assistant-related configurations and metadata.

---

## Key Features

* **Project Creation** → Start new projects from scratch with scaffolding.
* **Project Editing** → Modify existing projects with AI-powered suggestions.
* **Persistent Memory** → Stores chat history per project for long-term context.
* **Multi-Model Support** → Access to multiple AI models for different needs.
* **Toolkit for Productivity** → Easy-to-use set of developer-focused tools.

---

## Example Use Cases

* **Start a new project** → Generate boilerplate, initialize structure, set up configs.
* **Debug issues** → Identify bugs, propose fixes, and edit code automatically.
* **Implement new features** → Add functionality by leveraging stored project context.
* **Documentation** → Generate clear project docs and maintain consistency.
* **Project Management** → Track tasks, dependencies, and high-level architecture.

---

## Quick Start (Local)

Prerequisites
- Node.js 18+
- VS Code (latest) with Extension Development Host capability
- Neo4j (Desktop app or Docker)
- A vector DB (Milvus/Weaviate/pgvector) or use an in-memory stub during bootstrap

Steps
1. Clone this repo and open in VS Code.
2. Configure project settings in config/mira.json (endpoints, API keys). If not present yet, see docs/implementation-plan.md for the expected shape.
3. Start Neo4j and your vector DB locally (or plan to use Docker as below).
4. Launch the extension in a Dev Host: press F5 from extensions/vscode (once scaffolded).
5. Use the “Connect” command to discover MCP tools and start chatting.

Notes
- During early bootstrap, you can run with in-memory stores to avoid standing up databases.
- Timeouts default to 10s; adjust per your environment.

## Quick Start (Docker MCP Servers)

The docker/mcp-servers directory will contain Dockerfiles and compose templates for default servers (filesystem, exec, git, web, AST, reranker) and optional vector DB.

Typical workflow
- Ensure Docker is running.
- From docker/mcp-servers: `docker compose up -d`
- Point the extension’s transport endpoints to the exposed ports (see compose file output).

Security
- Avoid running exec/run with elevated privileges.
- Restrict filesystem scopes via allowlists.

## Documentation Map

- System Architecture: docs/01-system-architecture.md
- Plugin/Extension Architecture: docs/02-plugin-architecture.md
- Implementation Plan (this project): docs/implementation-plan.md
- MCP API Contracts: docs/api-contract.md
- Role Templates: docs/roles.md
