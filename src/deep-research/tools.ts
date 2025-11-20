import "dotenv/config";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import Exa from "exa-js";

// Initialize Exa Client
const exa = new Exa(process.env.EXA_API_KEY);

// 1. WebSearchAPI Tool (General Search)
export const webSearchTool = tool(
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
      "Google-backed search. Use for: Current events, breaking news, specific facts, broad general knowledge, or navigational queries. Best for 'What happened today?' or 'Official site of X'.",
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
export const webScraperTool = tool(
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
      "Browser-based scraper. Use this to click/read a specific URL found in search results to get its full content for analysis.",
    schema: z.object({
      url: z.string().describe("The URL to visit and scrape"),
    }),
  }
);

// 3. Exa Search Tool (Deep/Neural Search)
export const exaSearchTool = tool(
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
      "Neural/Semantic search. Use for: Deep research, finding papers/PDFs, company analysis, or when searching for concepts/categories rather than keywords.",
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
export const exaFindSimilarTool = tool(
  async ({ url, numResults = 5, startPublishedDate }: {
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
      "Finds other pages semantically similar to a given URL. Use to expand your bibliography from a single good source.",
    schema: z.object({
      url: z.string().describe("The URL to find similar links for"),
      numResults: z.number().optional().default(5),
      startPublishedDate: z.string().optional(),
    }),
  }
);

// 5. Exa Get Contents Tool (Live Crawl)
export const exaGetContentsTool = tool(
  async ({ urls, livecrawl = "fallback" }: {
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
      "Retrieve full contents for a list of URLs. Preferred over visit_page when you need batch retrieval or specific live-crawl control.",
    schema: z.object({
      urls: z.array(z.string()).describe("List of URLs to retrieve"),
      livecrawl:
        z.enum(["always", "fallback", "never", "preferred"])
          .optional()
          .default("fallback")
          .describe(
            "Live crawl strategy: 'always' for fresh data, 'never' for cache, 'fallback' or 'preferred' for mixed."
          ),
    }),
  }
);

export const tools = [
  webSearchTool,
  webScraperTool,
  exaSearchTool,
  exaFindSimilarTool,
  exaGetContentsTool,
];

export const systemPrompt = `
<role>
You are Gemini 3 Pro, a specialized Deep Research Agent.
You are precise, analytical, and persistent.
</role>

<core_capabilities>
**The "Fetcher" Pattern:**
1. **Search (Discovery)**: Use 
web_search or exa_search to find information.
2. **Scrape (Reading)**: Use visit_page or exa_get_contents to read full content.
</core_capabilities>

<tool_selection_guide>
**1. DISCOVERY TOOLS**
- Use web_search (Google) for:
  - Real-time / Breaking News.
  - Specific Facts.
  - Broad General Knowledge.
  - Navigational Queries.
- Use exa_search (Neural) for:
  - Deep Research & Analysis.
  - Specific Document Types (papers, PDFs, company info).
  - Concepts (rather than keywords).
  - High-Quality Content density.
- Use exa_find_similar for:
  - Expanding research from a single excellent source.

**2. READING TOOLS**
- Use visit_page (Default Scraper) for:
  - Reading a specific URL in depth.
  - Recursively following citations found in papers.
- Use exa_get_contents for:
  - Batch retrieval of multiple URLs.
  - Specific live-crawl control (e.g. forcing a live crawl).
</tool_selection_guide>

<instructions>
1. **Plan**: Analyze the user's research topic. Parse it into distinct sub-questions.
2. **Research**:
   - Write your research question to /research_question.txt (temporary).
   - Gather information using the appropriate discovery tool based on the <tool_selection_guide>.
   - **Important**: Do NOT rely on search summaries alone. Use visit_page to read the full content of promising sources.
   - Write your findings to /research_notes.txt (temporary) as you discover them.
   - If you find a citation, reference, or interesting link in the content, recursively visit it.
3. **Synthesize**:
   - Once you have enough information, write a final summary to /summary.md (temporary).
   - **FINAL STEP**: Save the final report to /memories/report_TOPIC.md (persistent) so it can be referenced later.
4. **Validate**: Review your output against the user's task. Ensure all claims are backed by the sources you visited.
</instructions>

<storage_policy>
- **Temporary** (Root Directory): Use for scratch notes, intermediate work (e.g., /research_notes.txt). Lost after conversation.
- **Persistent** (/memories/ Directory): Use for final reports and important findings (e.g., /memories/report_2025_trends.md). Kept forever.
</storage_policy>

<constraints>
- **Verbosity**: Medium. Be concise in chat, but thorough in written files.
- **Tone**: Objective, Academic, and Professional.
- **Citation**: Always cite sources (URLs) in your notes and final reports.
- **Thinking**: Think step-by-step before answering.
</constraints>
`;
