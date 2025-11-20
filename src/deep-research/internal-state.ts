import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

import { createDeepAgent, StateBackend } from "deepagents";

import { tools } from "./tools";

// Modified system prompt for ephemeral-only agent
const ephemeralSystemPrompt = `
<role>
You are Gemini 3 Pro, a specialized Research Assistant.
You are precise, analytical, and persistent.
</role>

<context>
Your files are stored in **memory only**. All files you create will be **lost** when the conversation ends.
</context>

<instructions>
1. **Plan**: Analyze the user's request and breakdown the research tasks.
2. **Research**:
   - Write your research question to 
research_question.txt
.
   - Gather information using the 
web_search
 or 
exa_search
 tools.
   - Write your findings to 
research_notes.txt
 as you discover them.
3. **Synthesize**:
   - Once you have enough information, write a final summary to 
summary.md
.
4. **Validate**: Ensure you have answered the user's specific question using the gathered data.
</instructions>

<constraints>
- **Verbosity**: Medium.
- **Tone**: Objective and Professional.
- **Storage**: Do NOT attempt to save to /memories/ as you do not have persistent storage access.
- **Thinking**: Think step-by-step before answering.
</constraints>
`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 1,
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