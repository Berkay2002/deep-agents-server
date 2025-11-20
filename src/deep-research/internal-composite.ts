import "dotenv/config";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { v4 as uuidv4 } from "uuid";
import { ExaRetriever } from "@langchain/exa";
import Exa from "exa-js";
import { Document } from "@langchain/core/documents";

import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

// WebSearchAPI Tool
const webSearchTool = tool(
  async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
    const apiKey = process.env.WEBSEARCHAPI_KEY;
    if (!apiKey) {
      return "Error: WEBSEARCHAPI_KEY is not set.";
    }

    try {
      const response = await fetch("https://api.websearchapi.ai/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          maxResults,
          includeContent: true,
        }),
      });

      if (!response.ok) {
        return `Error: WebSearchAPI request failed with status ${response.status}`;
      }

      const data = await response.json();
      return JSON.stringify(data);
    } catch (error) {
      return `Error performing web search: ${(error as Error).message}`;
    }
  },
  {
    name: "web_search",
    description:
      "Search the web for general queries, news, and recent information. Returns comprehensive results with content.",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults:
        z
          .number()
          .optional()
          .default(5)
          .describe("Maximum number of results to return"),
    }),
  }
);

// Exa Search Tool (Semantic Search)
const exaSearchTool = tool(
  async ({ query, numResults = 3 }: { query: string; numResults?: number }) => {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return "Error: EXA_API_KEY is not set.";
    }

    try {
      const retriever = new ExaRetriever({
        client: new Exa(apiKey),
        searchArgs: {
          numResults,
          highlights: true,
        },
      });

      const docs = await retriever.invoke(query);
      return JSON.stringify(
        docs.map((doc: Document) => ({
          title: doc.metadata.title,
          url: doc.metadata.url,
          highlights: doc.metadata.highlights,
          content: doc.pageContent,
        }))
      );
    } catch (error) {
      return `Error performing Exa search: ${(error as Error).message}`;
    }
  },
  {
    name: "exa_search",
    description:
      "Perform a semantic search to find specific documents, research papers, or content similar to the query. Good for deep research.",
    schema: z.object({
      query: z.string().describe("The semantic search query"),
      numResults:
        z
          .number()
          .optional()
          .default(3)
          .describe("Number of results to retrieve"),
    }),
  }
);

const systemPrompt = `You are a research assistant with both temporary and persistent storage.

## Storage Types

1. **Temporary files** (root directory): Stored in state, lost after conversation
   - Use for: scratch notes, intermediate work
   - Example: 
/research_notes.txt
, 
/draft.md

2. **Persistent memory** (/memories/ directory): Stored in database, kept forever
   - Use for: final reports, important findingss
   - Example: 
/memories/report_2025_ai_trends.md

## Workflow

1. Write your research question to 
/research_question.txt
 (temporary)
2. Gather information using the internet_search tool
3. Write your findings to 
/research_notes.txt
 (temporary) as you discover them
4. Once you have enough information, write a final summary to 
/summary.md
 (temporary)
5. **IMPORTANT**: Save the final report to 
/memories/report_TOPIC.md
 (persistent)

## Memory Guidelines

Always save completed reports to 
/memories/
 so they can be referenced in future conversations.
Use descriptive filenames like:
- 
/memories/report_ai_agents_2025.md

- 
/memories/findings_quantum_computing.md

- 
/memories/summary_market_analysis.md
`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 0,
  }),
  tools: [webSearchTool, exaSearchTool],
  systemPrompt,
  checkpointer: new MemorySaver(),
  store: new InMemoryStore(),
  backend: (config) =>
    new CompositeBackend(new StateBackend(config), {
      "/memories/": new StoreBackend(config),
    }),
});