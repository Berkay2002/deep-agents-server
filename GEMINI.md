# Project Context: deep-agents-server

## Overview
`deep-agents-server` is the backend runtime for "Deep Agents", specifically tailored for **Deep Research**. It hosts advanced AI agents capable of planning, recursive research, and dual-memory management (temporary vs. persistent).

The application is built with **Next.js 16** (App Router) and utilizes **LangGraph** for agent orchestration.

## Tech Stack
- **Framework:** Next.js 16.0.3 (App Router)
- **Language:** TypeScript
- **Agent Framework:**
  - **LangGraph:** Workflow orchestration.
  - **DeepAgents:** Custom agent wrapper (`deepagents`).
- **AI Models:** Google Gemini 3 Pro Preview (via `@langchain/google-genai`).
- **Search & Research Tools:**
  - **WebSearchAPI:** General search (`web_search`) and scraping (`visit_page`).
  - **Exa:** Neural search (`exa_search`), similarity finding (`exa_find_similar`), and content retrieval (`exa_get_contents`).
- **Persistence:**
  - **StateBackend:** Temporary, thread-local storage (root directory `/`).
  - **StoreBackend:** Persistent, cross-thread storage (`/memories/` directory).
- **Styling:** Tailwind CSS v4.

## Core Architecture: Deep Research Module
The core agent logic is centralized in `src/deep-research/`.

### 1. Deep Research Agent (`src/deep-research/deep-research-agent.ts`)
The primary agent configuration.
- **Backend:** `CompositeBackend`.
  - `/`: **StateBackend** (Temporary scratchpad).
  - `/memories/`: **StoreBackend** (Long-term knowledge base).
- **Model Config:** Gemini 3 Pro Preview (Temperature: 1).
- **Dependencies:** Imports tools and system prompt from `./tools`.

### 2. Tools & Prompts (`src/deep-research/tools.ts`)
Contains the definitions for all tools and the agent's system prompt.
- **Tools:** `webSearchTool`, `webScraperTool`, `exaSearchTool`, `exaFindSimilarTool`, `exaGetContentsTool`.
- **System Prompt:** Defines the "Fetcher" pattern, tool selection guide, and memory usage instructions.

### 3. Internal Variants
- `internal-state.ts`: Agent using only temporary State storage.
- `internal-store.ts`: Agent using only persistent Store storage.
- `internal-composite.ts`: Simplified composite backend example.

### 4. LangGraph Config (`src/deep-research/langgraph.json`)
Defines the available graphs: `agent` (main), `composite`, `state`, `store`.

## API Endpoints (`src/app/api/`)

- **`POST /api/threads`**
  - Creates a new conversation thread.

- **`POST /api/threads/[threadId]/runs/stream`**
  - Streams the agent's execution events (Server-Sent Events).
  - Connects to the `Deep Research Agent`.

- **`POST /api/threads/[threadId]/state`**
  - Updates thread state (shim implementation).

- **`POST /api/threads/search`**
  - **Stub Implementation:** Returns an empty list of threads.
  - *Note:* `MemorySaver` (current persistence) does not support listing threads. A database-backed store (e.g., Postgres) would be needed for full functionality.

## Project Structure
- `src/deep-research/`: Core agent logic.
    - `deep-research-agent.ts`: Main agent entry point.
    - `tools.ts`: Tool definitions and system prompt.
- `src/app/`: Next.js App Router.
    - `api/`: API routes.
- `public/`: Static assets.

## Environment Variables
- `GOOGLE_API_KEY`: Gemini models.
- `WEBSEARCHAPI_KEY`: Web search and scraping.
- `EXA_API_KEY`: Exa semantic search.