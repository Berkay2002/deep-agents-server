import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { v4 as uuidv4 } from "uuid";

import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

import { tools, systemPrompt, researchSubAgent, critiqueSubAgent } from "./tools";

export const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3-pro-preview",
    temperature: 1,
  }),
  tools,
  systemPrompt,
  subagents: [researchSubAgent, critiqueSubAgent],
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
  
  // You might want to increase recursion limit for this complex workflow
  await agent.invoke(
    {
      messages: [
        { role: "user", content: "Research the latest trends in AI agents for 2025 and write a report." },
      ],
    },
    {
      recursionLimit: 100, // Increased limit for research -> critique -> refine loop
      configurable: { thread_id: threadId },
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
