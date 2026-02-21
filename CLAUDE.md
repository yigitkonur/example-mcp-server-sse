# CLAUDE.md

## project

MCP SSE-to-Streamable-HTTP migration starter with scaffold CLI, using TypeScript SDK v2 pre-alpha (`2.0.0-alpha.0`).

## what's inside

- `src/server.ts`: entry point, bootstraps HTTP server and handles graceful shutdown
- `src/server/create-mcp-server.ts`: registers MCP tools, resources, and prompts (calculator demo)
- `src/server/session-registry.ts`: per-session transport lifecycle, creates and tracks sessions
- `src/server/http-server.ts`: raw Node.js HTTP server, routes `/mcp`, `/health`, `/` endpoints
- `src/server/in-memory-event-store.ts`: event replay store for reconnect/resume learning
- `src/demo-client.ts`: standalone Streamable HTTP client for manual testing
- `src/cli/create-mcp-streamable-starter.ts`: scaffold CLI, copies template and replaces tokens
- `templates/starter-streamable-v2/`: template project copied by scaffold CLI
- `vendor/`: pinned SDK v2 alpha tarballs (server, client, node)
- `scripts/smoke-server.mjs`: smoke test that boots server and calls tools via SDK client

## transport

- Streamable HTTP (replaces deprecated SSE transport)
- POST `/mcp` for JSON-RPC requests, GET `/mcp` for notification streams, DELETE `/mcp` for session close
- session ID passed via `mcp-session-id` header
- `NodeStreamableHTTPServerTransport` from `@modelcontextprotocol/node`
- `InMemoryEventStore` implements `EventStore` for replay

## sdk rules

- no `@modelcontextprotocol/sdk` imports (that is the v1 monolith)
- use split packages only: `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `@modelcontextprotocol/node`
- Zod v4 (`zod/v4`) for all schema definitions passed to registration APIs
- `McpServer` and `ResourceTemplate` from `@modelcontextprotocol/server`
- `NodeStreamableHTTPServerTransport` from `@modelcontextprotocol/node`
- `isInitializeRequest` from `@modelcontextprotocol/server` for routing logic
- no Express or other framework dependencies; raw `node:http` only

## commands

- `npm run dev`: start server with tsx (development)
- `npm run build`: compile TypeScript to `dist/`
- `npm run start`: run compiled server from `dist/server.js`
- `npm run create -- --name <name> --target <dir>`: scaffold new project
- `npm run demo:client`: run demo client against running server
- `npm run smoke:server`: run smoke test (boots server, calls tools, validates)
- `npm run check`: typecheck + lint + format check
- `npm run ci`: check + build + smoke test
- `npm run typecheck`: TypeScript type checking only
- `npm run lint`: ESLint
- `npm run format`: Prettier format
