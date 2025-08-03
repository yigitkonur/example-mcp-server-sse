# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose and Context

This is an **educational MCP server** demonstrating **modern best practices** with the **StreamableHTTP transport**. It serves as a production-ready reference implementation teaching the current recommended architectural patterns for MCP servers. The server implements a comprehensive calculator with golden standard MCP features using the singleton server pattern and modern single-endpoint transport.

## Essential Commands

```bash
# Development workflow
npm run dev                 # Start development server (port 1923)
npm run build              # TypeScript compilation
npm run typecheck          # TypeScript validation
npm run lint               # ESLint validation

# Production and debugging
npm start                  # Production server
npm run inspector          # Launch MCP Inspector for testing

# Code quality
npm run format             # Format with Prettier
npm run ci                 # Full CI pipeline (lint + typecheck + build)
```

## Core Architecture

### Modern MCP Server Architecture

The architecture follows the **current best practices** recommended by the MCP SDK:

- **Single `/mcp` endpoint**: Unified endpoint handling GET (SSE stream), POST (commands), DELETE (termination)
- **Singleton Server Pattern**: ONE shared `McpServer` instance serves all clients for maximum efficiency
- **StreamableHTTP Transport**: Modern transport with built-in session management and validation
- **Simple Session State**: In-memory map of session ID to transport instances (no complex managers needed)
- **Production-Ready Patterns**: Graceful shutdown, health monitoring, CORS configuration

### Key Architectural Components

**`src/server.ts`** - Consolidated server implementation

- Express server with StreamableHTTP transport
- Single `/mcp` endpoint with intelligent request routing
- Singleton `McpServer` instance created at startup
- Simple transport map for session management
- Production-ready shutdown and error handling
- CORS configuration with proper header exposure
- MCP server factory with comprehensive tool suite (7 tools)
- Resource system with static, dynamic, and templated resources
- Prompt templates for educational content generation
- Shared calculation history across all sessions

**`src/types.ts`** - Zod schemas and type definitions

- Operation enums and input/output validation
- Calculation history structure with `inputs[]` array format
- Mathematical constants and prompt argument schemas

### The Singleton Server Pattern (Critical Architecture)

This is the **most important architectural pattern** demonstrated in this codebase:

```typescript
// src/server.ts - Created ONCE at startup
const sharedMcpServer: McpServer = createCalculatorServer();
```

**Why This Matters:**

- **Memory Efficiency**: One server instance serves all clients vs. per-client instances
- **Shared State**: Calculation history is shared globally across all sessions
- **Scalability**: No memory overhead multiplication per connection
- **Best Practice**: Follows the MCP SDK's intended design pattern

**Connection Pattern:**

- Each client gets its own lightweight `StreamableHTTPServerTransport`
- All transports connect to the same shared `McpServer` instance
- State is maintained at the server level, not transport level

### Quality Assurance

The codebase demonstrates production-ready quality patterns:

- **TypeScript**: Strict type checking with comprehensive error handling
- **ESLint**: Modern flat config with TypeScript integration
- **Protocol Compliance**: `McpError` with specific `ErrorCode` values
- **Type Safety**: All catch blocks treat errors as `unknown` for maximum safety
- **Code Organization**: Constants extracted to prevent typos and enable refactoring

## Critical Implementation Details

### StreamableHTTP Request Flow

The unified `/mcp` endpoint handles the complete MCP lifecycle:

1. **POST without session**: Initialize new session
2. **POST with session**: Execute commands (tools/call, resources/read, etc.)
3. **GET with session**: Establish SSE stream for notifications
4. **DELETE with session**: Terminate session cleanly

### Progress Notification Pattern (Correct Implementation)

Demonstrates the **proper way** to handle progress in MCP:

```typescript
// CORRECT: Use client-provided progressToken
const progressToken = _meta?.progressToken;
if (progressToken) {
  await sendNotification({
    method: 'notifications/progress',
    params: { progressToken, progress: 50, total: 100 },
  });
}
```

### Modern Parameter Design

Tool parameters follow modern, intuitive naming:

- **Calculator tool**: `op/a/b` format (vs. legacy `operation/input_1/input_2`)
- **History entries**: `inputs: number[]` array for flexible operation storage
- **Zod validation**: Type-safe parameter validation throughout

### Production Feature Set

Implements comprehensive MCP capabilities:

**Tools (7 total)**:

- `calculate`: Core arithmetic with shared history
- `batch_calculate`: Array processing demonstration
- `advanced_calculate`: Expression parsing with variables
- `demo_progress`: **Correct progress notification pattern**
- `solve_math_problem`: Natural language math interpretation
- `explain_formula`: Knowledge base serving
- `calculator_assistant`: Conversational interface

**Resources (3 types)**:

- `calculator://constants`: Static mathematical constants
- `calculator://stats`: Dynamic session statistics
- `calculator://history/{param}`: Templated resource with ID/limit queries

**Prompts (3 educational)**:

- `explain-calculation`: Context-rich LLM prompts
- `generate-problems`: History-informed content generation
- `calculator-tutorial`: Dynamic educational content

### Quality Assurance

- **51 passing tests**: Comprehensive unit and integration coverage
- **Type safety**: Full TypeScript with Zod validation
- **Error handling**: JSON-RPC compliant error responses
- **Memory efficiency**: Singleton pattern prevents per-client overhead

## Configuration & Testing

### Port Configuration

- **Default**: Port 1923 (configurable via `--port` CLI or `PORT` env var)
- **Health endpoint**: `GET /health` for monitoring
- **MCP endpoint**: `POST/GET/DELETE /mcp` for all protocol operations

### Testing the Server

```bash
# Interactive testing with official MCP Inspector
npm run inspector

# Direct curl testing (see README.md for complete examples)
curl -X POST http://localhost:1923/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'
```

## Educational Value

This codebase serves as a **production-ready reference implementation** teaching:

### Architecture Patterns

- **Singleton Server Pattern**: The most critical MCP architectural best practice
- **Single-Endpoint Design**: Modern `/mcp` endpoint handling all operations
- **Clean Separation**: Business logic (calculator-server.ts) independent of transport (index.ts)
- **Production Readiness**: Graceful shutdown, health monitoring, CORS configuration

### Advanced Features Demonstrated

- **7 Comprehensive Tools**: From basic calculate to complex batch operations
- **3 Resource Types**: Static constants, dynamic stats, templated history
- **3 Educational Prompts**: Explain calculations, generate problems, tutorials
- **Progress Notifications**: Correct client-token usage pattern
- **Session Management**: Simple in-memory map with automatic cleanup

### Code Quality Standards

- **TypeScript**: Full type safety with Zod validation
- **Error Handling**: Comprehensive error responses and logging
- **Testing**: 51 passing tests with unit and integration coverage
- **Documentation**: Inline comments explaining key patterns

**Target Audience**: Developers learning to build world-class MCP servers using current best practices
