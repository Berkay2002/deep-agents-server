import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

import { createDeepAgent, StateBackend } from "deepagents";

import { tools } from "./tools";

// Modified system prompt for ephemeral-only agent
const ephemeralSystemPrompt = `You are a research assistant.

Your files are stored in memory and will be lost when the conversation ends.

## Workflow

1. Write your research question to \`research_question.txt\`
2. Gather information using the web_search or exa_search tools
3. Write your findings to \`research_notes.txt\` as you discover them
4. Once you have enough information, write a final summary to \`summary.md

`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 0,
  }),
  tools,
  systemPrompt: ephemeralSystemPrompt,
  backend: (config) => new StateBackend(config),
});

async function main() {
  console.log("Starting ephemeral research agent...");
  
  await agent.invoke(
    {
      messages: [
        new HumanMessage("Research the latest trends in AI agents for 2025"),
      ],
    },
    { recursionLimit: 50 },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
