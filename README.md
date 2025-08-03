<div align="center">

**[STDIO](https://github.com/yigitkonur/example-mcp-server-stdio) | [Stateful HTTP](https://github.com/yigitkonur/example-mcp-server-streamable-http) | [Stateless HTTP](https://github.com/yigitkonur/example-mcp-server-streamable-http-stateless) | [Legacy SSE](https://github.com/yigitkonur/example-mcp-server-sse)**

</div>

---

# 🎓 MCP Stateful HTTP Server (Singleton Pattern) - Educational Reference

<div align="center">

**A Production-Ready Model Context Protocol Server Teaching Singleton Architecture and In-Memory State Best Practices**

[![MCP Version](https://img.shields.io/badge/MCP-Latest%20Spec-blue)](https://spec.modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![SDK](https://img.shields.io/badge/SDK-Production%20Ready-green)](https://github.com/modelcontextprotocol/typescript-sdk)
[![Architecture](https://img.shields.io/badge/Architecture-Singleton%20Server-gold)]()

*Learn by building a world-class MCP server with a focus on efficiency, clean architecture, and production-grade resilience.*

</div>

## 🎯 Project Goal & Core Concepts

This repository is a **deeply educational reference implementation** that demonstrates how to build a production-quality MCP server using the **Stateful Singleton Server** pattern. It is the perfect starting point for creating stateful services that are efficient, robust, and easy to understand.

Through a fully-functional calculator server, this project will teach you:

1.  **🏗️ Architecture & Design**: Master the **Singleton Server Pattern**, where a single, shared `McpServer` instance manages all business logic and state, while lightweight, per-session transports handle client connections.
2.  **⚙️ Protocol & Transport Mastery**: Correctly implement the modern **`StreamableHTTPServerTransport`**, using a single `/mcp` endpoint to handle the entire connection lifecycle (initialization, commands, and streaming).
3.  **🛡️ Production-Grade Resilience**: Implement non-negotiable production features like **graceful shutdowns** to prevent data loss, robust CORS policies, and a `/health` check endpoint for monitoring.
4.  **⚡ State & Resource Management**: Learn to manage session state efficiently using a simple **in-memory map** (`sessionId -> transport`), which is a clean and performant approach for single-node deployments.
5.  **🚨 Protocol-Compliant Error Handling**: Understand the critical difference between generic errors and protocol-aware errors by using **`McpError` with specific `ErrorCode`s** to communicate failures clearly and effectively to clients.

## 🤔 When to Use This Architecture

The Singleton Server pattern is a powerful and efficient model. It is the ideal choice for:

*   **Single-Instance Deployments:** Perfect for applications running on a single server or virtual machine where all user sessions are handled by one process.
*   **Rapid Prototyping:** The simplest way to get a stateful MCP server running without the complexity of an external database or cache.
*   **Services with Volatile State:** Suitable for applications where session data does not need to persist if the server restarts.
*   **Foundation for Scalability:** This architecture can be extended with an external state store (like Redis) to support horizontal scaling, as demonstrated in the "Stateful HTTP" reference implementation.

## 🚀 Quick Start

### Prerequisites

*   Node.js ≥ 20.0.0
*   npm or yarn
*   A basic understanding of TypeScript, Express.js, and JSON-RPC.

### Installation & Running

```bash
# Clone the repository
git clone https://github.com/yigitkonur/example-mcp-server-sse
cd example-mcp-server-sse

# Install dependencies
npm install

# Start the server (defaults to port 1923)
npm start
```

### Essential Commands

```bash
npm run dev        # Development mode with hot-reload (uses tsx)
npm run build      # TypeScript compilation to dist/
npm run start      # Run the production-ready server
npm run typecheck  # TypeScript validation
npm run lint       # ESLint validation  
npm run inspector  # Launch the MCP Inspector for interactive testing```

## 📐 Architecture Overview

### Key Principles

This server is built on a set of core principles that define its efficiency and maintainability.

1.  **Singleton Server Core:** One `McpServer` instance containing all tools, resources, and business logic is created at startup. This is memory-efficient and provides a single, authoritative source for application state.
2.  **Per-Session Transports:** Each connecting client is assigned its own lightweight `StreamableHTTPServerTransport`. These transports are stored in a simple in-memory map, keyed by the session ID.
3.  **Unified Endpoint:** All MCP communication occurs over a single HTTP endpoint (`/mcp`). The SDK's transport layer intelligently routes `POST`, `GET`, and `DELETE` requests internally.
4.  **Decoupled Logic:** The business logic (defined in the `createCalculatorServer` factory function) is functionally decoupled from the web server transport layer (the Express app), even though they reside in the same `server.ts` file for project simplicity. This separation makes the code easier to reason about and test.

### Architectural Diagram

```
┌─────────────────────────────────────┐
│      Express HTTP Server            │  ← API Layer (Single /mcp Endpoint)
├─────────────────────────────────────┤
│   Middleware (CORS, JSON Parsing)   │  ← Web Server Configuration
├─────────────────────────────────────┤
│   In-Memory Transport Store         │  ← Simple Session State
│    (Session ID → Transport Map)     │
├─────────────────────────────────────┤
│    Singleton MCP Server Core        │  ← SHARED Business Logic
│  • Tools • Resources • Prompts      │
├─────────────────────────────────────┤
│  StreamableHTTP Transport Layer     │  ← MCP Protocol Engine
└─────────────────────────────────────┘
```

## 🔧 Core Implementation Patterns

This section highlights the most critical, non-negotiable best practices demonstrated in this server.

### Pattern 1: The Singleton Server Instance

**The Principle:** To ensure shared state (like `calculationHistory`) and efficient memory usage, a single, global `McpServer` instance is created when the application starts. This instance is then shared across all user connections.

**The Implementation:**
```typescript
// src/server.ts

// The factory function defines all server capabilities.
function createCalculatorServer(): McpServer { /* ... all tools ... */ }

// ✅ BEST PRACTICE: Create ONE shared McpServer instance at startup.
const sharedMcpServer: McpServer = createCalculatorServer();
console.log('[Server] Shared Calculator MCP Server instance created.');

// This 'sharedMcpServer' will be connected to every new client transport.```

### Pattern 2: Per-Session Transport Management

**The Principle:** The main `/mcp` route handler acts as a dispatcher. It checks for a session ID in the request header. If valid, it retrieves the existing transport. If not, it creates a new transport for the new session, connects it to the singleton server, and stores it for future requests. This logic is the heart of stateful session management.

**The Implementation:**
```typescript
// src/server.ts
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.all('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && transports[sessionId]) {
    // Existing Session: Reuse the transport from our in-memory map.
    // ...
  } else if (isInitializeRequest(req.body)) {
    // New Session: Create a new transport for the client.
    // ...
    // Store the new transport for future requests.
    transports[newSessionId] = transport;
  } else {
    // Invalid Request: Respond with an HTTP 400/404 error.
    // ...
  }

  // Delegate to the correct transport to handle the request.
  await transport.handleRequest(req, res, req.body);
});
```

### Pattern 3: Protocol-Compliant Error Handling

**The Principle:** A robust server must clearly distinguish between a server failure and invalid user input. Throwing a generic `Error` is an anti-pattern because it results in a vague "Internal Server Error" for the client. The best practice is to throw a specific `McpError` with a standard `ErrorCode`.

**The Implementation:**
```typescript
// src/server.ts - inside the 'calculate' tool

// ❌ ANTI-PATTERN: This hides the true cause of the error from the client.
// throw new Error('Division by zero is not allowed');

// ✅ BEST PRACTICE: Use McpError with a specific ErrorCode.
// This tells the client that the user's parameters were invalid, allowing
// the client application to display a helpful error message to the user.
if (op === 'divide' && b === 0) {
    throw new McpError(
        ErrorCode.InvalidParams, // The user's input was invalid.
        'Division by zero is not allowed.'
    );
}
```

**Additional Hardening:**
```typescript
// Type-safe catch blocks treat errors as 'unknown' for maximum safety
} catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Handle safely without assuming error type
}
```

### Pattern 4: Production-Ready Graceful Shutdown

**The Principle:** A production server must never be killed abruptly. A graceful shutdown handler ensures that all active connections are properly closed, pending operations are finished, and resources are released before the process exits.

**The Implementation:**
```typescript
// src/server.ts
const httpServer = app.listen(PORT, /* ... */);

const shutdown = () => {
  // 1. Close all active client transports to notify clients.
  for (const sessionId in transports) {
    transports[sessionId]?.close();
  }

  // 2. Stop the HTTP server from accepting new connections.
  httpServer.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });

  // 3. Force exit after a timeout to prevent hanging.
  setTimeout(() => { process.exit(1); }, 5000);
};

process.on('SIGINT', shutdown); // Ctrl+C
process.on('SIGTERM', shutdown); // `docker stop`
```

## 🧪 Testing & Validation

### Health & Metrics

A `/health` endpoint is included for monitoring and diagnostics.

```bash
# Check the server's health and active session count
curl http://localhost:1923/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "activeSessions": 0,
  "transport": "streamableHttp",
  "uptime": 15.3,
  "memory": { /* ... memory usage details ... */ }
}
```

### Manual Request (`curl`)

Test the full connection lifecycle using `curl`.

```bash
# Terminal 1: Initialize a session and capture the Mcp-Session-Id header.
SESSION_ID=$(curl -si -X POST http://localhost:1923/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  | grep -i 'Mcp-Session-Id' | awk '{print $2}' | tr -d '\r')

echo "Acquired Session ID: $SESSION_ID"

# Terminal 2: Use the session ID to call a tool.
curl -X POST http://localhost:1923/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0","id": 2,"method": "tools/call","params": {"name": "calculate","arguments": {"op": "divide", "a": 10, "b": 0}}}'
```
**Expected Error Response (from the `b: 0` invalid param):**
```json
{"jsonrpc":"2.0","id":2,"error":{"code":-32602,"message":"Division by zero is not allowed."}}
```

### Interactive Testing with MCP Inspector

Use the official inspector CLI to interactively explore and test all of the server's capabilities.

```bash
# This command connects the inspector to your running server.
npm run inspector
```

## 🏭 Deployment & Configuration

### Configuration

The server is configured using environment variables:

| Variable | Description | Default |
| :--- |:--- |:--- |
| `PORT` | The port for the HTTP server to listen on. | `1923` |
| `CORS_ORIGIN` | Allowed origin for CORS requests. **Should be set to a specific domain in production.** | `*` |

### Deployment

This server is designed for a **single-node deployment**.

*   **State Management:** Because session state is stored in the server's memory, all requests for a given session *must* be routed to the same server process.
*   **Scaling:** This architecture does not scale horizontally out-of-the-box. To run multiple instances, you would need a load balancer configured with **"sticky sessions"** (session affinity). For true horizontal scaling, see the "Stateful HTTP" reference implementation which uses Redis.
*   **Deployment:** It can be run as a standalone Node.js process or containerized using a `Dockerfile`.

## 🛡️ Error Handling Philosophy

This server demonstrates a robust error handling strategy that is critical for production MCP servers:

### User Errors vs. Server Errors

A critical distinction is made between invalid user input and true server failures:

- **`ErrorCode.InvalidParams`**: Thrown when the user provides bad data (e.g., dividing by zero). This tells the client "you made a mistake."
- **`ErrorCode.InternalError`**: Thrown for unexpected server-side issues. This tells the client "we made a mistake."

### Implementation Benefits

- **No Leaked Details:** Errors are wrapped in `McpError` to prevent internal details like stack traces from being sent to the client.
- **Clear Client Communication:** Clients receive specific error codes that enable them to provide helpful feedback to users.
- **Transport-Level Errors:** The `/mcp` endpoint returns specific HTTP 400/404 errors for session-related issues, separating them from tool execution failures.

### Example in Action

When a user attempts division by zero, the server responds with:
```json
{"jsonrpc":"2.0","error":{"code":-32602,"message":"Division by zero is not allowed."}}
```

This tells the client exactly what went wrong and allows for graceful error handling in the user interface.

## Key Architectural Takeaways

*   **The Singleton Pattern is Efficient:** For single-node deployments, using one server instance with many lightweight transports is highly memory-efficient.
*   **Decouple Logic from Transport:** Keeping business logic (`createCalculatorServer`) separate from the web framework (`Express`) makes the code cleaner, more testable, and easier to maintain.
*   **Errors are Part of the Protocol:** Handling errors correctly with `McpError` is not just a detail—it is a core feature of a robust and reliable server that enables clients to build better user experiences.
*   **Plan for Production:** Features like graceful shutdowns and health checks are not afterthoughts; they are fundamental requirements for any service that needs to be reliable.