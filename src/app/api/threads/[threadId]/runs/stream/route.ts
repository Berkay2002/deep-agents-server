import { NextRequest, NextResponse } from "next/server";
import { agent } from "@/deep-research/deep-research-agent";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

interface MessageInput {
  type: "human" | "ai" | "tool" | "system";
  content: string;
  name?: string;
  id?: string;
  tool_calls?: { name: string; args: Record<string, unknown>; id?: string }[];
  tool_call_id?: string;
}

interface StreamInput {
  input?: {
    messages?: MessageInput[];
  };
  command?: {
    resume?: unknown;
    goto?: string | string[];
    update?: unknown;
  };
  config?: {
    configurable?: Record<string, unknown>;
    recursion_limit?: number;
  };
  checkpoint_id?: string;
  interrupt_before?: string[];
  interrupt_after?: string[];
  stream_mode?: string | string[];
}

// Helper to format raw messages into LangChain Message objects
const formatMessages = (messages: MessageInput[]): BaseMessage[] => {
  return messages.map((msg) => {
    if (msg.type === "human") {
      return new HumanMessage({
        content: msg.content,
        name: msg.name,
        id: msg.id,
      });
    } else if (msg.type === "ai") {
      return new AIMessage({
        content: msg.content,
        name: msg.name,
        tool_calls: msg.tool_calls
          ? msg.tool_calls.map((tc) => ({
              name: tc.name,
              args: tc.args,
              id: tc.id,
              type: "tool_call" as const,
            }))
          : undefined,
        id: msg.id,
      });
    } else if (msg.type === "tool") {
      return new ToolMessage({
        content: msg.content,
        name: msg.name,
        tool_call_id: msg.tool_call_id || "unknown",
        id: msg.id,
      });
    } else if (msg.type === "system") {
      return new SystemMessage({
        content: msg.content,
        name: msg.name,
        id: msg.id,
      });
    }
    return new HumanMessage({ content: JSON.stringify(msg) }); // Fallback
  });
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const body = await req.json();
  
  const {
    input,
    command,
    config: runConfig,
    interrupt_before,
    interrupt_after,
    stream_mode = ["values", "messages", "updates", "debug"],
  }: StreamInput = body;

  const langGraphConfig = {
    configurable: { thread_id: threadId, ...(runConfig?.configurable || {}) },
    recursionLimit: runConfig?.recursion_limit ?? 50,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stream: any;
  // We cast stream_mode to 'any' here because the strict type definition in LangGraph 
  // might not perfectly align with the array of strings we are passing, 
  // even though it is valid at runtime.
  const streamModes = Array.isArray(stream_mode) ? stream_mode : [stream_mode];
  const streamOptions = {
      ...langGraphConfig,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      streamMode: streamModes as any,
      interruptAfter: interrupt_after,
      interruptBefore: interrupt_before,
  };

  try {
    // Case 1: Command (Resume, Goto, etc.)
    if (command) {
      // Handle resume command specifically
      if (command.resume) {
        stream = await agent.stream(
          new Command({ resume: command.resume }),
          streamOptions
        );
      } else if (command.goto) {
         // Handle goto/update if provided
         stream = await agent.stream(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Command({ goto: command.goto, update: command.update as any }),
            streamOptions
         )
      }
    } 
    // Case 2: New Input (Messages)
    else if (input && input.messages) {
      const formattedMessages = formatMessages(input.messages);
      stream = await agent.stream(
        { messages: formattedMessages },
        streamOptions
      );
    }
    // Case 3: Just running (e.g. from checkpoint or stateless start)
    else {
       stream = await agent.stream(null, streamOptions)
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for await (const chunk of (stream as any)) {
             let eventType = "data";
             let data = chunk;
             
             // If we requested multiple modes, chunk is [mode, data]
             if (Array.isArray(chunk) && chunk.length === 2 && typeof chunk[0] === 'string') {
                 eventType = chunk[0];
                 data = chunk[1];
             }
             
             const eventPayload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
             controller.enqueue(encoder.encode(eventPayload));
          }
          
          // Signal end of stream
          controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
          controller.close();
        } catch (e) {
          console.error("Streaming error:", e);
          const errorPayload = `event: error\ndata: ${JSON.stringify({ message: (e as Error).message })}\n\n`;
          controller.enqueue(encoder.encode(errorPayload));
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Agent initialization/run error:", error);
    return NextResponse.json(
      { error: "Failed to start agent run.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
