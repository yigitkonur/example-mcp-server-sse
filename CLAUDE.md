# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose and Context

This is an **educational MCP server** demonstrating the **legacy HTTP + SSE transport pattern**. It's specifically designed to teach the deprecated two-endpoint SSE approach (`GET /connect` + `POST /messages`) versus modern transports. The server implements a calculator with golden standard MCP features but uses SSE for learning purposes.

## Essential Commands

```bash
# Development workflow
npm run dev                 # Start development server (port 1923)
npm run build              # TypeScript compilation
npm run test               # Run test suite (51 passing tests expected)
npm run typecheck          # TypeScript validation
npm run lint               # ESLint validation

# Testing specific components
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
jest src/tests/calculator-server.test.ts  # Run specific test file

# Production and debugging
npm start                  # Production server
npm run inspector          # Launch MCP Inspector for testing
npm run client             # Run CLI demo client

# Code quality
npm run format             # Format with Prettier
npm run ci                 # Full CI pipeline (lint + typecheck + test + build)
```

## Core Architecture

### SSE Transport Implementation
The architecture centers around a **two-endpoint SSE pattern** that's fundamentally different from modern MCP transports:

- **`GET /connect`**: Establishes SSE stream, creates session ID, returns endpoint info
- **`POST /messages`**: Receives JSON-RPC messages, requires `sessionId` query parameter
- **Session Management**: Global `transports` object maps session IDs to `SSEServerTransport` instances
- **Lifecycle**: Each connection gets an isolated MCP server instance via `createCalculatorServer()`

### Key Architectural Components

**`src/server/index.ts`** - Express server with SSE transport
- Session ID generation and cleanup
- Middleware for selective JSON parsing (skips `/messages` endpoint)
- CORS configuration for cross-origin SSE connections
- Logging middleware for request tracing

**`src/server/calculator-server.ts`** - MCP server factory
- Creates fresh `McpServer` instance per session
- Implements tools (calculate, demo_progress), resources (constants, history, stats), prompts
- In-memory calculation history with configurable limits
- Progress notifications via SSE events for `demo_progress` tool

**`src/types/calculator.ts`** - Zod schemas and type definitions
- Operation enums and input/output validation
- Calculation history structure with `inputs[]` array format
- Mathematical constants and prompt argument schemas

### Session Isolation Pattern
Unlike stateless transports, this SSE implementation requires **per-session state management**:
- Each SSE connection creates a new MCP server instance
- Calculation history is isolated per session
- Session cleanup on disconnect prevents memory leaks
- Transport registry enables message routing to correct session

### Testing Architecture
The test suite uses a hybrid approach:
- **Unit tests**: `calculator-server.test.ts` with in-memory transport
- **Integration tests**: `sse-integration.test.ts` with real Express server
- **Test utilities**: `test-utils.ts` for common patterns
- **Jest configuration**: ESM support with ts-jest, custom module mapping

## Critical Implementation Details

### SSE Event Handling
The server sends multiple SSE event types:
- `endpoint`: Initial session info with `/messages?sessionId=...`
- `message`: Standard JSON-RPC responses
- `progress`: Custom progress notifications from `demo_progress` tool

### Parameter Evolution
The calculator tool parameters have been modernized from `operation/input_1/input_2` to `op/a/b` format. History entries use `inputs: number[]` array instead of separate properties.

### Golden Standard Compliance
Implements the MCP learning demo golden standard with:
- Core tools: `calculate`, `explain-calculation`, `generate-problems`
- Extended tools: `demo_progress` (with SSE progress events), stub implementations for complex tools
- Resources: `calculator://constants`, `calculator://history/*`, `calculator://stats`
- Proper error handling, input validation, and progress notifications

### Known Test Issues
Some tests are intentionally skipped with TODO comments due to:
- Prompt content expectations not matching actual template output
- Client capabilities being undefined in test environment
- SSE session timing issues in integration tests

The main test suite should show **51 passing, 8 skipped, 0 failing** for optimal user experience.

## Port Configuration
Default port is **1923** (configurable via `--port` CLI argument or `PORT` environment variable). This differs from many examples that use 3000 or 8080.

## Educational Value
This codebase serves as a reference for understanding:
- Why SSE transport was deprecated (complexity, session management, asymmetric channels)
- How two-endpoint patterns work vs. modern single-endpoint approaches
- Session lifecycle management in persistent connections
- Progress notification patterns in SSE streams