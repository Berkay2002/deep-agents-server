import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { v4 as uuidv4 } from "uuid";

import { createDeepAgent, StoreBackend } from "deepagents";

import { tools } from "./tools";

// Modified system prompt for fully persistent agent
const persistentSystemPrompt = `You are a research assistant with persistent cross-conversation storage.

Your files persist across all conversations and threads using the store.

## Workflow

1. Write your research question to \`research_question.txt\`
2. Gather information using the web_search tool
3. Write your findings to \`research_notes.txt\` as you discover them
4. Once you have enough information, write a final summary to \`summary.md\`

## Important

All files you create are shared across ALL conversations. This means you can reference
previous research in new conversations.`;

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 0,
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
