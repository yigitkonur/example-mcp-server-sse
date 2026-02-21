# 04 - Migration Notes

## From Legacy SSE-Era Assumptions to v2

Old assumption:

- "Server should expose `SSEServerTransport` directly."

v2 approach:

- Use Streamable HTTP transport behavior.
- Keep session lifecycle explicit.
- Use GET stream attachment behavior only in stateful flows.

## Code-Level Migration Checklist

- No `@modelcontextprotocol/sdk` imports.
- No server-side `SSEServerTransport` usage.
- Use split packages (`server`, `client`, `node`).
- Keep schemas as Zod v4 objects.
- Keep shutdown and cleanup deterministic.

## This Repository’s Migration Position

This repo is intentionally migration-oriented:

- It demonstrates v2-compatible structure.
- It keeps behavior explicit instead of magic abstractions.
- It includes a scaffold generator so teams can start from the same baseline.
