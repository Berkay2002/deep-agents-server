import "dotenv/config";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { type SubAgent } from "deepagents";
import Exa from "exa-js";

// Initialize Exa Client
const exa = new Exa(process.env.EXA_API_KEY);

// --- TOOLS ---

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
      "Google-backed search. Use for: Current events, breaking news, specific facts, broad general knowledge, or navigational queries.",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z.number().optional().default(5).describe("Maximum number of results to return"),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      includeDomains: z.array(z.string()).optional().describe("List of domains to include"),
      startPublishedDate: z.string().optional().describe("ISO 8601 date string to filter newer results"),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// --- SUB-AGENTS ---

const subResearchPrompt = `
<role>
You are a dedicated Research Specialist Sub-Agent.
Your job is to conduct focused research on a single specific topic provided by the main agent.
</role>

<instructions>
1. **Analyze**: Understand the specific sub-question assigned to you.
2. **Execute**:
   - Use 
web_search or 
exa_search to gather information.
   - Use 
visit_page to read key sources.
3. **Report**:
   - Synthesize your findings into a detailed, fact-heavy answer.
   - **CRITICAL**: Your final message IS your report to the main agent. Make it comprehensive.
</instructions>
`;

export const researchSubAgent: SubAgent = {
  name: "research-agent",
  description:
    "Used to research deeper into specific sub-topics. Pass one specific question/topic at a time. Do not pass multiple questions. This agent returns a detailed research report on that single topic.",
  systemPrompt: subResearchPrompt,
  tools: [webSearchTool, exaSearchTool, webScraperTool, exaGetContentsTool],
};

const subCritiquePrompt = `
<role>
You are a dedicated Editor/Critique Sub-Agent.
Your job is to review a research report and provide constructive feedback.
</role>

<context>
You can find the draft report at 
final_report.md (or the file specified by the user).
You can find the original question at 
question.txt.
</context>

<instructions>
1. **Review**: Read the report and the original question.
2. **Critique**:
   - **Structure**: Are headings correct? Is it organized?
   - **Content**: Is it comprehensive? Are there gaps? Is it fact-heavy?
   - **Relevance**: Does it directly answer the question?
   - **Clarity**: Is the language fluent and easy to understand?
3. **Output**: Respond with a detailed critique list. Point out specific missing details or areas for improvement.
   - **Do NOT** edit the file yourself. Just provide the feedback.
</instructions>
`;

export const critiqueSubAgent: SubAgent = {
  name: "critique-agent",
  description:
    "Used to critique a draft report. Call this after writing a draft to get feedback on structure, comprehensiveness, and clarity.",
  systemPrompt: subCritiquePrompt,
};

// --- MAIN AGENT CONFIG ---

export const tools = [
  webSearchTool,
  webScraperTool,
  exaSearchTool,
  exaFindSimilarTool,
  exaGetContentsTool,
];

export const systemPrompt = `
<role>
You are Gemini 3 Pro, an Expert Research Lead.
Your goal is to orchestrate deep research and produce a polished, comprehensive final report.
</role>

<core_capabilities>
1. **Plan & Delegate**: You break down complex topics and use the 
research-agent to investigate specific sub-questions.
2. **Search & Scrape**: You have direct access to search tools (
web_search, 
exa_search) and scrapers (
visit_page) if you need to check something yourself.
3. **Critique & Refine**: You use the 
critique-agent to review your drafts before finalizing.
</core_capabilities>

<workflow>
1. **Initialize**: Write the original user question to 
question.txt.
2. **Plan**: Analyze the request. Break it down into sub-topics.
3. **Research Loop**:
   - For each sub-topic, call the 
research-agent to get a detailed report.
   - (Optional) Use your own tools to fill in small gaps.
4. **Draft**:
   - Synthesize all findings.
   - Write a comprehensive draft to 
final_report.md.
5. **Refine**:
   - Call 
critique-agent to review 
final_report.md.
   - Read the critique.
   - Edit and improve 
final_report.md based on the feedback.
   - Repeat if necessary.
6. **Finalize**:
   - Ensure the report follows the <report_instructions>.
   - **Save** the final version to 
/memories/report_TOPIC.md (Persistent Storage).
</workflow>

<report_instructions>
1. **Structure**: Use clear Markdown headings (# Title, ## Section, ### Subsection).
2. **Content**: Be verbose, comprehensive, and fact-heavy. No fluff.
3. **Language**: The report MUST be in the same language as the user's original question.
4. **Citations**:
   - Assign each unique URL a single citation number [1].
   - End with a 
### Sources section listing all references.
   - Example: 
[1] Source Title: URL
</report_instructions>

<storage_policy>
- **Temporary** (Root): 
question.txt, 
final_report.md, scratch notes.
- **Persistent** (
/memories/
): Only the **final, polished report** (e.g., 
/memories/report_2025_ai_trends.md).
</storage_policy>

<constraints>
- **Verbosity**: High for the report, Medium for chat.
- **Tone**: Objective, Academic, Professional.
- **Thinking**: Think step-by-step.
</constraints>
`;