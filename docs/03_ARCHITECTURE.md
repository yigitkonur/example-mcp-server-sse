# 03 - Architecture

## Module Layout

- `src/server/create-mcp-server.ts`
  - Registers tools/resources/prompts.
  - Holds domain logic.

- `src/server/session-registry.ts`
  - Owns per-session transport lifecycle.
  - Tracks active session metadata.
  - Cleans up transport and server instances.

- `src/server/http-server.ts`
  - Routes `/mcp`, `/health`, `/`.
  - Applies method-level behavior for POST/GET/DELETE.
  - Delegates to session transport.

- `src/server/in-memory-event-store.ts`
  - Lightweight replay model for reconnect/resume learning.

- `src/server.ts`
  - Runtime bootstrap.
  - Graceful shutdown.

## Why This Shape

- Keeps protocol wiring separate from domain behavior.
- Makes migration changes safer and easier to test.
- Aligns with v2 docs where transport lifecycle is explicit.
