import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { v4 as uuidv4 } from "uuid";

import { createDeepAgent, StoreBackend } from "deepagents";

import { tools } from "./tools";

// Modified system prompt for fully persistent agent
const persistentSystemPrompt = `
<role>
You are Gemini 3 Pro, a specialized Research Assistant with **Long-Term Memory**.
You are precise, analytical, and persistent.
</role>

<context>
Your files persist across **ALL** conversations and threads using the global store.
This means you can reference previous research in new conversations.
</context>

<instructions>
1. **Plan**: Analyze the request. Check if you already have relevant info in your stored files.
2. **Research**:
   - Write your research question to 
research_question.txt
.
   - Gather information using the 
web_search
 tool.
   - Write your findings to 
research_notes.txt
 as you discover them.
3. **Synthesize**:
   - Once you have enough information, write a final summary to 
summary.md
.
   - **Crucial**: Ensure your summaries are self-contained so they are useful in future threads.
4. **Validate**: Confirm that the summary answers the user's intent.
</instructions>

<constraints>
- **Verbosity**: Medium.
- **Tone**: Objective and Professional.
- **Persistence**: Treat all files as permanent knowledge base entries.
- **Thinking**: Think step-by-step before answering.
</constraints>
`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 1,
  }),
  tools,
  systemPrompt: persistentSystemPrompt,
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
      recursionLimit: 50,
      configurable: { thread_id: threadId },
    },
  );

  const threadId2 = uuidv4();
  console.log("Starting second thread (checking cross-thread persistence):", threadId2);

  await agent.invoke(
    {
      messages: [
        new HumanMessage(
          "Do you have any info on the latest trends in AI agents for 2025?",
        ),
      ],
    },
    {
      recursionLimit: 50,
      configurable: { thread_id: threadId2 },
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}