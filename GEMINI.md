# Project Context: deep-agents-server

## Overview
`deep-agents-server` is the backend runtime for "Deep Agents", specifically tailored for **Deep Research**. It hosts advanced AI agents capable of planning, recursive research, and dual-memory management (temporary vs. persistent).

The application is built with **Next.js 16** (App Router) and utilizes **LangGraph** for agent orchestration and **DeepAgents** as the agent framework.

## Tech Stack
- **Framework:** Next.js 16.0.3 (App Router)
- **Language:** TypeScript
- **Agent Framework:**
  - **LangGraph:** Workflow orchestration.
  - **DeepAgents:** Custom agent wrapper (`deepagents`) providing `CompositeBackend`, `SubAgent` support, and file system abstractions.
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
The primary agent configuration using `createDeepAgent`.
- **Backend:** `CompositeBackend`.
  - `/`: **StateBackend** (Temporary scratchpad).
  - `/memories/`: **StoreBackend** (Long-term knowledge base).
- **Model Config:** Gemini 3 Pro Preview (Temperature: 1).
- **Subagents:**
  - `researchSubAgent`: Specialized researcher for sub-topics.
  - `critiqueSubAgent`: Editor for reviewing drafts.
- **Dependencies:** Imports tools and system prompt from `./tools`.

### 2. Tools & Prompts (`src/deep-research/tools.ts`)
Contains the definitions for all tools, subagents, and the agent's system prompt.

#### Tools
- `webSearchTool` (`web_search`): Google-backed general search.
- `webScraperTool` (`visit_page`): Browser-based scraper for reading URLs.
- `exaSearchTool` (`exa_search`): Neural/Semantic search for deep research (papers, companies, etc.).
- `exaFindSimilarTool` (`exa_find_similar`): Finds semantically similar pages.
- `exaGetContentsTool` (`exa_get_contents`): Batch retrieval of page contents (preferred over scraping for multiple URLs).

#### Subagents
- **Research Agent** (`research-agent`):
  - **Role:** Research Specialist.
  - **Task:** Conducts focused research on a single specific topic/question.
  - **Tools:** `web_search`, `exa_search`, `visit_page`, `exa_get_contents`.
- **Critique Agent** (`critique-agent`):
  - **Role:** Editor/Critique.
  - **Task:** Reviews a draft report (e.g., `final_report.md`) against the original question and provides constructive feedback on structure, content, and clarity.
  - **Tools:** None (Pure LLM analysis).

#### System Prompt
Defines the "Expert Research Lead" persona.
- **Workflow:**
  1. Initialize (`question.txt`).
  2. Plan & Delegate (break down topics).
  3. Research Loop (call `research-agent`).
  4. Draft (`final_report.md`).
  5. Refine (call `critique-agent`, then edit).
  6. Finalize (save to `/memories/report_TOPIC.md`).

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
    - `tools.ts`: Tool definitions, subagents, and system prompt.
- `src/app/`: Next.js App Router.
    - `api/`: API routes.
- `public/`: Static assets.

## Environment Variables
- `GOOGLE_API_KEY`: Gemini models.
- `WEBSEARCHAPI_KEY`: Web search and scraping.
- `EXA_API_KEY`: Exa semantic search.
