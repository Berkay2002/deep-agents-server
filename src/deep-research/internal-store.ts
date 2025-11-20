import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { v4 as uuidv4 } from "uuid";

import { createDeepAgent, StoreBackend } from "deepagents";

import { tools, researchSubAgent, critiqueSubAgent } from "./tools";

// Modified system prompt for fully persistent agent
const persistentSystemPrompt = `
<role>
You are Gemini 3 Pro, an Expert Research Lead with **Long-Term Memory**.
Your goal is to orchestrate deep research and produce a polished, comprehensive final report.
</role>

<context>
Your files persist across **ALL** conversations and threads using the global store.
You can reference previous research (\"/memories/\") in new conversations.
</context>

<workflow>
1. **Initialize**: Check \`/memories/\` for existing relevant reports. Write the user question to \`question.txt\".
2. **Plan**: Analyze the request. Break it down into sub-topics.
3. **Research Loop**:
   - Call the \`research-agent\` for detailed sub-topic reports.
4. **Draft**:
   - Synthesize findings.
   - Write a comprehensive draft to \`final_report.md\".
5. **Refine**:
   - Call \`critique-agent\` to review \`final_report.md\".
   - Edit and improve based on feedback.
6. **Finalize**:
   - **Save** the final version to \`/memories/report_TOPIC.md\".
   - Ensure the filename is descriptive so you can find it later.
</workflow>

<constraints>
- **Verbosity**: High for the report.
- **Tone**: Objective, Academic, Professional.
- **Persistence**: Treat all files as permanent knowledge base entries.
</constraints>
`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 1,
  }),
  tools,
  systemPrompt: persistentSystemPrompt,
  subagents: [researchSubAgent, critiqueSubAgent],
  checkpointer: new MemorySaver(),
  store: new InMemoryStore(),
  backend: (config) => new StoreBackend(config),
});

async function main() {
  const threadId = uuidv4();
  console.log("Starting persistent research thread:", threadId);
  
  await agent.invoke(
    {
      messages: [
        new HumanMessage("Research the latest trends in AI agents for 2025"),
      ],
    },
    {
      recursionLimit: 100,
      configurable: { thread_id: threadId },
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
