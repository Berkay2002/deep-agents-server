<div align="center">
  <img src="public/fathom.svg" alt="Fathom Logo" width="240" height="240" />
  <h1>Fathom</h1>
  <p><strong>Deep Research Agent Runtime & Orchestration Engine</strong></p>
  
  <p>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="https://langchain.com/"><img src="https://img.shields.io/badge/LangGraph-Orchestration-orange?style=flat-square" alt="LangGraph" /></a>
    <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/AI-Gemini%203%20Pro-8E44AD?style=flat-square" alt="Gemini" /></a>
  </p>
</div>

---

## 🌊 Overview

**Fathom** is a specialized backend runtime designed for autonomous **Deep Research**. Unlike simple chatbots, Fathom hosts advanced AI agents capable of long-horizon planning, recursive information gathering, and self-correcting report generation.

Built on **Next.js 16** and **LangGraph**, Fathom acts as the brain for complex research tasks, managing dual-layer memory (ephemeral scratchpads vs. persistent knowledge) and orchestrating a team of specialized sub-agents.

## ✨ Key Features

- **🧠 Autonomous Planning:** Deconstructs ambiguous user queries into structured research plans and specific sub-questions.
- **🔎 Recursive Investigation:** Delegates tasks to specialized **Research Sub-Agents** that act independently to gather facts using neural search and web scraping.
- **📝 Self-Correction Loop:** Features a dedicated **Critique Sub-Agent** that reviews drafts for clarity, accuracy, and completeness before finalization.
- **💾 Dual-Memory Architecture:** 
  - **StateBackend:** Handles high-frequency, temporary reasoning traces.
  - **StoreBackend:** Persists finalized reports and valuable knowledge artifacts.
- **🛠️ Advanced Toolset:** Integrated with **Exa** (`exa_search`, `exa_find_similar`, `exa_get_contents`) for neural search, and **WebSearchAPI** (`web_search`, `visit_page`) for general search and scraping, enabling deep, semantic web traversal.

## 🧰 Tooling Strategy: Exa vs. WebSearchAPI

Fathom leverages a powerful, complementary set of search and scraping tools to ensure comprehensive research capabilities. The core idea is to use the right tool for the right job, distinguishing between deep semantic understanding and specific fact retrieval.

### Exa (Neural/Semantic Search)
Exa is designed for deep research, going beyond simple keyword matching to understand the semantic meaning and context of a query.

-   **`exa_search`**: Use for **concept exploration** and finding high-quality, LLM-optimized content. Ideal for discovering research papers, company analyses, or broad conceptual information across specific categories.
-   **`exa_find_similar`**: Use for **expanding research** from a known good source. Given a URL, it finds semantically similar pages, helping to build a comprehensive bibliography or related content without needing new keywords.
-   **`exa_get_contents`**: Use for **batch content retrieval** of multiple URLs. It efficiently fetches the full, processed text of pages, often with summarization and live-crawl options, making it superior for gathering large amounts of data from identified sources.

### WebSearchAPI (Keyword-based / Google Search)
WebSearchAPI provides traditional, keyword-driven search capabilities, useful for pinpointing specific information and real-time data.

-   **`web_search`**: Use for **fact retrieval**, **current events**, **breaking news**, or **navigational queries**. It's effective when you need quick, precise answers based on recent indexing (like Google search results).
-   **`visit_page`**: Use as a **direct page scraper** to fetch the full raw content of a specific URL. This is valuable when the exact, uninterpreted content of a page is required for detailed analysis.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following API keys:
- **Google Gemini:** `GOOGLE_API_KEY` (Model inference)
- **WebSearchAPI:** `WEBSEARCHAPI_KEY` (General search & scraping)
- **Exa:** `EXA_API_KEY` (Neural/Semantic search)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/berkay2002/fathom.git
    cd fathom
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment:**
    Create a `.env` file in the root directory:
    ```bash
    GOOGLE_API_KEY=your_key_here
    WEBSEARCHAPI_KEY=your_key_here
    EXA_API_KEY=your_key_here
    ```

4.  **Start the server:**
    ```bash
    npm run dev
    ```
    The agent runtime will be available at `http://localhost:3000`.

## 🏗️ Architecture

Fathom employs a hierarchical multi-agent system centralized in `src/deep-research/`.

### The Workflow
1.  **Lead Agent (Planner):** Receives the query and writes a research plan.
2.  **Researcher (Worker):** Executes specific sub-tasks using `exa_search`, `exa_find_similar`, `exa_get_contents`, `web_search`, and `visit_page`.
3.  **Writer (Synthesizer):** Compiles findings into a draft (`final_report.md`).
4.  **Critic (Editor):** Reviews the draft against the original prompt and requests revisions.
5.  **Publisher:** Saves the polished markdown report to persistent storage.

### Core Components

| Component | Path | Description |
| :--- | :--- | :--- |
| **Deep Research Agent** | `src/deep-research/deep-research-agent.ts` | The primary orchestrator using `CompositeBackend`. |
| **Tools Definition** | `src/deep-research/tools.ts` | Definitions for search, scrape, and sub-agent interfaces. |
| **API Routes** | `src/app/api/threads/` | Endpoints for thread creation and event streaming (SSE). |

## 🔌 API Usage

Fathom exposes REST endpoints compatible with LangGraph client implementations.

> [!NOTE]
> The API uses Server-Sent Events (SSE) for real-time agent streaming.

**Create a Thread**
```http
POST /api/threads
```

**Stream a Run**
```http
POST /api/threads/{threadId}/runs/stream
Content-Type: application/json

{
  "input": {
    "messages": [
      { "role": "user", "content": "Research the latest advancements in solid-state batteries." }
    ]
  }
}
```

## 📂 Project Structure

```
/
├── public/              # Static assets (Logos, icons)
├── src/
│   ├── app/             # Next.js App Router (API & UI)
│   │   └── api/         # Agent API endpoints
│   └── deep-research/   # 🧠 Core Agent Logic
│       ├── deep-research-agent.ts  # Main entry point
│       ├── tools.ts                # Tool & Sub-agent definitions
│       └── langgraph.json          # Graph configuration
└── package.json
```

<br />

<div align="center">
  <sub>Built with 💙 by the Fathom Team.</sub>
</div>