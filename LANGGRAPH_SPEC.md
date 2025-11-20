# LangGraph Server Protocol Specification

## Overview
This document outlines the technical specifications required to implement a backend server compatible with the official `@langchain/langgraph-sdk` client. This specification is derived from a deep-dive analysis of the SDK source code (specifically `client.ts`, `utils/sse.ts`, and `utils/stream.ts`).

## 1. Transport Protocol
The official SDK exclusively uses **Server-Sent Events (SSE)** for streaming execution results.
*   **Method:** `POST`
*   **Content-Type:** `text/event-stream`
*   **Connection:** `keep-alive`

## 2. Endpoint Structure
To maintain compatibility with the SDK's `client.runs.stream()` method, the server should expose the following route structure (though the client allows configuring the base URL, the relative paths are fixed):

```
POST /threads/{thread_id}/runs/stream
```

## 3. Request Specification
The client sends a JSON body with the following schema:

```typescript
interface StreamInput {
  // 1. Standard Input (Messages)
  input?: {
    messages?: Array<{
      type: "human" | "ai" | "tool" | "system";
      content: string;
      name?: string;
      tool_calls?: any[];
    }>;
  };

  // 2. Control Commands (for Human-in-the-loop)
  command?: {
    resume?: unknown;      // Value to provide to the paused graph
    goto?: string;         // Node to jump to
    update?: unknown;      // State update to apply
  };

  // 3. Configuration
  config?: {
    configurable?: Record<string, unknown>;
    recursion_limit?: number;
  };

  // 4. Stream Configuration (CRITICAL)
  stream_mode?: StreamMode | StreamMode[]; 
}

type StreamMode = "values" | "messages" | "updates" | "debug" | "events";
```

## 4. Response Specification (Critical)

### 4.1 Headers
The server **MUST** return the following headers. The `Content-Location` header is strictly required for the client to discover the `run_id`.

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Content-Location: /threads/{thread_id}/runs/{generated_run_id}
```

**Why?** The SDK client parses `Content-Location` using a regex to extract the `run_id`. If missing, the client will yield events but `run_id` will be `undefined`, breaking tracing and feedback features.

### 4.2 Event Format
The server must stream data in the standard SSE format:

```
event: {stream_mode}
data: {json_payload}

```

### 4.3 Handling `stream_mode`
The LangGraph agent returns chunks differently based on the requested `stream_mode`.

**Case A: Single Mode (e.g., `stream_mode="values"`)**
The agent yields the raw data object.
*   **Event:** `values` (or whatever mode was requested)
*   **Data:** JSON string of the chunk.

**Case B: Multiple Modes (e.g., `stream_mode=["values", "updates"]`)**
The agent yields a **tuple**: `[mode, payload]`.
*   **Logic:** The server must unpack this tuple.
*   **Event:** `chunk[0]` (The mode, e.g., "updates")
*   **Data:** `chunk[1]` (The payload)

## 5. Reference Implementation (Next.js App Router)

```typescript
import { v4 as uuidv4 } from "uuid";

// ... inside POST handler ...

// 1. Generate Run ID
const runId = uuidv4();

// 2. Prepare Config with Run ID
const config = {
  configurable: { 
    thread_id: threadId,
    run_id: runId, // REQUIRED for tracing
    ...inputConfig 
  }
};

// 3. Execute Stream
const stream = await agent.stream(inputs, {
  ...config,
  streamMode: stream_mode // Pass through directly
});

// 4. Transform to SSE
const readableStream = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      let event = "data";
      let data = chunk;

      // Handle Tuple (Multi-mode)
      if (Array.isArray(chunk) && chunk.length === 2 && typeof chunk[0] === 'string') {
        event = chunk[0];
        data = chunk[1];
      }

      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    }
    controller.close();
  }
});

// 5. Return Response with Header
return new NextResponse(readableStream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Content-Location": `/threads/${threadId}/runs/${runId}`
  }
});
```

## 6. Client-Side Compatibility Verification
This specification ensures compatibility with:
*   `client.runs.stream()`
*   `client.runs.wait()` (which internally uses stream)
*   `useStream` hooks in `@langchain/langgraph-sdk/react-ui`

```