# architecture

module layout, request lifecycle, and design rationale for the MCP Streamable HTTP migration starter.

## module layout

```
src/
  server.ts                          entry point, bootstrap and graceful shutdown
  demo-client.ts                     standalone Streamable HTTP client for testing
  cli/
    create-mcp-streamable-starter.ts scaffold CLI entry point
  server/
    create-mcp-server.ts             MCP primitive registrations (tools, resources, prompts)
    session-registry.ts              per-session transport lifecycle management
    http-server.ts                   raw Node.js HTTP server and endpoint routing
    in-memory-event-store.ts         event store for SSE replay on reconnect
```

| module | responsibility |
|--------|---------------|
| `src/server.ts` | parses `PORT`/`HOST` from env or `--port` flag, creates `SessionRegistry`, starts HTTP server, handles `SIGINT`/`SIGTERM` for graceful shutdown |
| `src/server/create-mcp-server.ts` | creates an `McpServer` instance, registers `calculate` tool (arithmetic with structured output), `history-summary` tool, `calc://history` resource, `calc://history/{id}` resource template, and `explain-calculation` prompt |
| `src/server/session-registry.ts` | creates `NodeStreamableHTTPServerTransport` per session with UUID-based session IDs, wires each transport to a new `McpServer` instance, tracks sessions in a `Map`, handles session close and full shutdown |
| `src/server/http-server.ts` | `node:http` server with routing for `/mcp` (POST/GET/DELETE), `/health` (GET), and `/` (GET). extracts `mcp-session-id` header, validates JSON-RPC body, delegates to transport or returns JSON-RPC errors |
| `src/server/in-memory-event-store.ts` | implements the SDK `EventStore` interface. stores events keyed by generated IDs, supports `replayEventsAfter` for clients reconnecting mid-stream |
| `src/demo-client.ts` | connects via `StreamableHTTPClientTransport`, lists tools, calls `calculate`, prints result, terminates session |
| `src/cli/create-mcp-streamable-starter.ts` | copies `templates/starter-streamable-v2` to target dir, copies `vendor/` tarballs, replaces `__PROJECT_NAME__` and `__PROJECT_DESCRIPTION__` tokens in all text files |

## request lifecycle

a full session lifecycle through the Streamable HTTP transport:

1. client sends `POST /mcp` with a JSON-RPC `initialize` request (no `mcp-session-id` header)
2. `http-server.ts` detects missing session ID and verifies the body is an `initialize` request via `isInitializeRequest()`
3. `session-registry.ts` creates a new `InMemoryEventStore`, a new `McpServer` (with tools/resources/prompts), and a new `NodeStreamableHTTPServerTransport` with a UUID session ID generator
4. the transport's `onsessioninitialized` callback stores the session state in the registry
5. `server.connect(transport)` wires the MCP server to the transport
6. the transport handles the initialize request and returns the response with a `mcp-session-id` header
7. subsequent `POST /mcp` requests include the `mcp-session-id` header; `http-server.ts` looks up the session in the registry and delegates to its transport
8. `GET /mcp` with a valid session ID opens a server-sent event stream for async notifications
9. `DELETE /mcp` with a valid session ID terminates the session; the transport's `onsessionclosed` callback removes it from the registry
10. on `SIGINT`/`SIGTERM`, `server.ts` closes the HTTP server and calls `registry.closeAll()` to clean up all sessions

## design rationale

**separation of domain and transport.** `create-mcp-server.ts` knows nothing about HTTP, sessions, or transports. it only registers MCP primitives. this makes it safe to change transport wiring without touching business logic, which is the core migration concern.

**session-per-transport model.** each session gets its own `McpServer` instance and its own `NodeStreamableHTTPServerTransport`. this avoids shared mutable state between sessions and simplifies cleanup.

**raw `node:http` instead of Express.** the HTTP routing is minimal (three paths, three methods). a framework would add dependency weight without meaningful value for the migration learning goal.

**in-memory event store.** the `InMemoryEventStore` demonstrates the SDK's `EventStore` interface for SSE replay. production deployments should replace this with a persistent store (Redis, database, etc.).

## next steps

- [03-scaffold-cli.md](03-scaffold-cli.md) -- generate your own project from this architecture
- [04-sdk-v2-notes.md](04-sdk-v2-notes.md) -- understand the v2 SDK packages used here
- [01-getting-started.md](01-getting-started.md) -- go back to setup if you haven't run the server yet
