# 01 - V2 SDK Primer

## Purpose

Explain the current v2 SDK state and what it changes for real server projects.

## Current State (February 21, 2026)

- v2 APIs are documented on the official `typescript-sdk` `main` branch.
- v2 is pre-alpha.
- v1.x remains the stable production recommendation.

## Package Model

v2 splits concerns across packages:

- `@modelcontextprotocol/server`
- `@modelcontextprotocol/client`
- `@modelcontextprotocol/node`

This separation is central to v2 migration design.

## Transport Model Shift

Legacy server-side `SSEServerTransport` is removed in v2.

For server implementations, Streamable HTTP behavior is now the migration target:

- POST: request/response flow
- GET (stateful mode): notification stream behavior
- DELETE: session termination

## Runtime Expectations

- Node.js 20+
- ESM modules
- Zod v4 schemas for registrations

## Related Docs

- Next: `02_SCAFFOLDER_CLI.md`
- Architecture details: `03_ARCHITECTURE.md`
