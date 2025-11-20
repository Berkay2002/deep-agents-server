/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import Exa from "exa-js";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

// Initialize Exa Client
const exa = new Exa(process.env.EXA_API_KEY);

// 1. WebSearchAPI Tool (General Search)
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
      "Use this tool to find initial information and sources on a topic. Returns search results with summaries.",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
    }),
  }
);

// 2. WebSearchAPI Scraper Tool (Direct Page Visit)
const webScraperTool = tool(
  async ({ url }: { url: string }) => {
    const apiKey = process.env.WEBSEARCHAPI_KEY;
    if (!apiKey) {
      return "Error: WEBSEARCHAPI_KEY is not set.";
    }

    try {
      const response = await fetch("https://api.websearchapi.ai/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          returnFormat: "markdown",
          engine: "browser",
        }),
      });

      if (!response.ok) {
        return `Error: WebScraper request failed with status ${response.status}`;
      }

      const data = await response.json();
      return JSON.stringify(data);
    } catch (error) {
      return `Error performing web scrape: ${(error as Error).message}`;
    }
  },
  {
    name: "visit_page",
    description:
      "Use this to read a specific URL that you found in a search result or citation to get more details.",
    schema: z.object({
      url: z.string().describe("The URL to visit and scrape"),
    }),
  }
);

// 3. Exa Search Tool (Deep/Neural Search)
const exaSearchTool = tool(
  async ({
    query,
    numResults = 5,
    category,
    includeDomains,
    startPublishedDate,
  }: {
    query: string;
    numResults?: number;
    category?: string;
    includeDomains?: string[];
    startPublishedDate?: string;
  }) => {
    if (!process.env.EXA_API_KEY) return "Error: EXA_API_KEY is not set.";

    try {
      const result = await exa.searchAndContents(query, {
        numResults,
        category: category as any,
        includeDomains,
        startPublishedDate,
        text: true,
        highlights: true,
        summary: true,
      });
      return JSON.stringify(result);
    } catch (error) {
      return `Error performing Exa search: ${(error as Error).message}`;
    }
  },
  {
    name: "exa_search",
    description:
      "Perform a semantic/neural search to find high-quality documents. returns text, highlights, and summaries.",
    schema: z.object({
      query: z.string().describe("The search query"),
      numResults: z.number().optional().default(5),
      category: z
        .enum([
          "company",
          "research paper",
          "news",
          "pdf",
          "github",
          "tweet",
          "personal site",
          "linkedin profile",
          "financial report",
        ])
        .optional()
        .describe("Filter by category"),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe("List of domains to include"),
      startPublishedDate: z
        .string()
        .optional()
        .describe("ISO 8601 date string to filter newer results"),
    }),
  }
);

// 4. Exa Find Similar Tool
const exaFindSimilarTool = tool(
  async ({
    url,
    numResults = 5,
    startPublishedDate,
  }: {
    url: string;
    numResults?: number;
    startPublishedDate?: string;
  }) => {
    if (!process.env.EXA_API_KEY) return "Error: EXA_API_KEY is not set.";

    try {
      const result = await exa.findSimilarAndContents(url, {
        numResults,
        startPublishedDate,
        text: true,
        highlights: true,
        summary: true,
      });
      return JSON.stringify(result);
    } catch (error) {
      return `Error performing Exa find similar: ${(error as Error).message}`;
    }
  },
  {
    name: "exa_find_similar",
    description:
      "Find links and content similar to a specific URL. Useful for expanding research from a key source.",
    schema: z.object({
      url: z.string().describe("The URL to find similar links for"),
      numResults: z.number().optional().default(5),
      startPublishedDate: z.string().optional(),
    }),
  }
);

// 5. Exa Get Contents Tool (Live Crawl)
const exaGetContentsTool = tool(
  async ({
    urls,
    livecrawl = "fallback",
  }: {
    urls: string[];
    livecrawl?: string;
  }) => {
    if (!process.env.EXA_API_KEY) return "Error: EXA_API_KEY is not set.";

    try {
      const result = await exa.getContents(urls, {
        text: true,
        summary: true,
        livecrawl: livecrawl as any,
      });
      return JSON.stringify(result);
    } catch (error) {
      return `Error performing Exa get contents: ${(error as Error).message}`;
    }
  },
  {
    name: "exa_get_contents",
    description:
      "Retrieve full contents, summaries, and metadata for specific URLs. Supports live crawling for fresh content.",
    schema: z.object({
      urls: z.array(z.string()).describe("List of URLs to retrieve"),
      livecrawl: z
        .enum(["always", "fallback", "never", "preferred"])
        .optional()
        .default("fallback")
        .describe(
          "Live crawl strategy: 'always' for fresh data, 'never' for cache, 'fallback' or 'preferred' for mixed."
        ),
    }),
  }
);

const systemPrompt = `You are a Deep Research Agent powered by Gemini 3 Pro.

## Core Capabilities: The "Fetcher" Pattern
You have two primary modes of operation for exploration:
1. **Search (Discovery)**: Use \`web_search\` or \`exa_search\` to find information and sources on a topic. This gives you the "Top N" results.
2. **Scrape (Reading)**: Use \`visit_page\` or \`exa_get_contents\` to "click" on a specific link and read its full content.

**Recursive Research Strategy:**
- Start by searching for your topic.
- Read the search results.
- If you find a citation, reference, or promising URL inside a search result, **do not just stop**.
- Use \`visit_page\` to recursively drill down into that specific source to verify claims or get deeper context.

## Tool Guide
- \`web_search\`: General web search. Best for initial discovery.
- \`visit_page\`: Scrapes a specific URL using a browser engine. Use this to read deep content found in search results.
- \`exa_search\`: Semantic search. Best for finding papers, pdfs, and technical content.
- \`exa_find_similar\`: Finds more sources like a specific URL.
- \`exa_get_contents\`: Alternative to visit_page, good for batch retrieval or specific live-crawl needs.

## Storage Policy
- **Temporary**: Use the root directory (e.g. \"/scratchpad.md\") for intermediate notes.
- **Persistent**: Use \`/memories/\` (e.g. \`/memories/topic_summary.md\") for final reports and key findings.

## Goal
Perform deep, comprehensive research. Always cite your sources (URLs) in your notes and final reports.`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 0,
  }),
  tools: [
    webSearchTool,
    webScraperTool,
    exaSearchTool,
    exaFindSimilarTool,
    exaGetContentsTool,
  ],
  systemPrompt,
  checkpointer: new MemorySaver(),
  store: new InMemoryStore(),
  backend: (config) =>
    new CompositeBackend(
      new StateBackend(config),
      {
        "/memories/": new StoreBackend(config),
      }
    ),
});