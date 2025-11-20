import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

import { createDeepAgent, StateBackend } from "deepagents";

import * as ToolsModule from "./tools";

// Modified system prompt for ephemeral-only agent to match the new structure
// but limiting storage instructions
const ephemeralSystemPrompt = `
<role>
You are Gemini 3 Pro, an Expert Research Lead.
Your goal is to orchestrate deep research and produce a polished, comprehensive final report.
</role>

<core_capabilities>
1. **Plan & Delegate**: You break down complex topics and use the \`research-agent\` to investigate specific sub-questions.
2. **Search & Scrape**: You have direct access to search tools if you need to check something yourself.
3. **Critique & Refine**: You use the \`critique-agent\` to review your drafts before finalizing.
</core_capabilities>

<context>
Your files are stored in **memory only**. All files you create will be **lost** when the conversation ends.
</context>

<workflow>
1. **Initialize**: Write the original user question to \`question.txt\`.
2. **Plan**: Analyze the request. Break it down into sub-topics.
3. **Research Loop**:
   - For each sub-topic, call the \`research-agent\` to get a detailed report.
4. **Draft**:
   - Synthesize all findings.
   - Write a comprehensive draft to \`final_report.md\`.
5. **Refine**:
   - Call \`critique-agent\` to review \`final_report.md\`.
   - Edit and improve \`final_report.md\` based on the feedback.
6. **Finalize**:
   - Ensure the report is comprehensive.
   - **NOTE**: You cannot save to /memories/ in this mode. Just leave the final report in \`final_report.md\`.
</workflow>

<constraints>
- **Verbosity**: High for the report.
- **Tone**: Objective, Academic, Professional.
- **Storage**: Do NOT attempt to save to /memories/.
</constraints>
`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 1,
  }),
  tools: ToolsModule.tools,
  systemPrompt: ephemeralSystemPrompt,
  subagents: [ToolsModule.researchSubAgent, ToolsModule.critiqueSubAgent],
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
    { recursionLimit: 100 },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
