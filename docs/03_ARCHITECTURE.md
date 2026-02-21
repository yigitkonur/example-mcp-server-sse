# 03 - Architecture

## Purpose

Describe the runtime architecture and why responsibilities are separated the way they are.

## Module Layout

- `src/server/create-mcp-server.ts`
  - Registers tools/resources/prompts.
  - Encapsulates domain behavior.

- `src/server/session-registry.ts`
  - Owns per-session transport lifecycle.
  - Tracks and cleans session state.

- `src/server/http-server.ts`
  - Handles `/mcp`, `/health`, and root endpoints.
  - Routes by HTTP method and delegates to transport.

- `src/server/in-memory-event-store.ts`
  - Demonstrates replay behavior for reconnect/resume learning.

- `src/server.ts`
  - Bootstraps runtime and performs graceful shutdown.

## Request Lifecycle (High-Level)

1. Client sends `POST /mcp` initialize request.
2. Registry creates transport + session state.
3. Subsequent requests use session header and existing transport.
4. `GET /mcp` supports stateful notification-stream behavior.
5. `DELETE /mcp` closes session.

## Why This Design

- Reduces coupling between domain logic and transport wiring.
- Makes migration-related changes safer.
- Makes scaffolded projects easier to maintain.

## Related Docs

- Previous: `02_SCAFFOLDER_CLI.md`
- Next: `04_MIGRATION_NOTES.md`
