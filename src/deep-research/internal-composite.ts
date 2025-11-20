import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { v4 as uuidv4 } from "uuid";

import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

import { tools, systemPrompt } from "./tools";

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 1,
  }),
  tools,
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

async function main() {
  const threadId = uuidv4();

  console.log("Starting research thread:", threadId);
  
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
  console.log("Starting second thread (checking persistence):", threadId2);
  
  await agent.invoke(
    {
      messages: [
        new HumanMessage(
          "Do you have any info on the latest trends in AI agents for 2025 from the previous chat?",
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