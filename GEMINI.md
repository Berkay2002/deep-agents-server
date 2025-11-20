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
The core agent logic has moved to `src/deep-research/`.

### 1. Deep Research Agent (`src/deep-research/deep-research-agent.ts`)
The primary agent designed for "Recursive Research".
- **Pattern:** "Fetcher" (Search -> Scrape -> Read -> Follow).
- **Backend:** `CompositeBackend`.
  - `/`: **StateBackend** (Temporary scratchpad).
  - `/memories/`: **StoreBackend** (Long-term knowledge base).
- **Tools:**
  - `web_search`: Discovery (Google/WebSearchAPI).
  - `visit_page`: Reading/Scraping specific URLs.
  - `exa_search`: Deep semantic/neural search.
  - `exa_find_similar`: Expanding from a source.
  - `exa_get_contents`: Batch content retrieval.

### 2. Internal Variants
- `internal-state.ts`: Agent using only temporary State storage.
- `internal-store.ts`: Agent using only persistent Store storage.
- `internal-composite.ts`: Simplified composite backend example.

### 3. LangGraph Config (`src/deep-research/langgraph.json`)
Defines the available graphs: `agent` (main), `composite`, `state`, `store`.

## API Endpoints (`src/app/api/`)
- **`POST /api/threads`**
  - Creates a new conversation thread.

- **`POST /api/threads/[threadId]/runs/stream`**
  - Streams the agent's execution events (Server-Sent Events).
  - Uses the `Deep Research Agent` (`src/deep-research/deep-research-agent.ts`).

- **`POST /api/threads/[threadId]/state`**
  - Updates thread state (shim implementation).

## Project Structure
- `src/deep-research/`: **NEW** Core agent logic and configuration.
- `src/app/`: Next.js App Router.
    - `api/`: API routes (needs repair).
- `public/`: Static assets.

## Environment Variables
- `GOOGLE_API_KEY`: Gemini models.
- `WEBSEARCHAPI_KEY`: Web search and scraping.
- `EXA_API_KEY`: Exa semantic search.
