# 01 - V2 SDK Primer

## Current State

As of **February 21, 2026**, the official TypeScript SDK `main` branch documents v2 pre-alpha APIs.

Practical implications:

- Treat v2 as migration-focused and evolving.
- Keep implementation simple and explicit.
- Prefer official examples and docs for API shape confirmation.

## Package Split

v2 separates responsibilities:

- `@modelcontextprotocol/server`: server primitives and protocol surface.
- `@modelcontextprotocol/client`: client primitives and transports.
- `@modelcontextprotocol/node`: Node.js middleware/transport adapters.

## Transport Shift

Legacy server-side `SSEServerTransport` is removed.

In v2, server implementations should use Streamable HTTP behavior:

- POST handles JSON-RPC request/response.
- Stateful mode supports notification stream behavior via GET.
- DELETE closes active sessions.

## Runtime Expectations

- Node.js 20+
- ESM
- Zod v4 schemas in registration APIs
