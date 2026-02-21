# MCP v2 Streamable HTTP Migration Starter

A learning-first boilerplate for building MCP servers on top of the official TypeScript SDK v2 pre-alpha primitives.

## Changelog (Latest First)

- `2026-02-21`: Major rewrite for upcoming TypeScript SDK v2.
  - Migrated from v1-style monolith to modular Streamable HTTP architecture.
  - Added project scaffold CLI and starter template.
  - Added root + generated-project smoke validation.
  - Removed legacy server-side SSE transport usage.
- Full changelog: `CHANGELOG.md`

## v2 SDK Status (Important)

As of **February 21, 2026**:

- The official `typescript-sdk` `main` branch contains v2 pre-alpha APIs.
- v1.x remains the stable production recommendation.
- v2 server-side legacy `SSEServerTransport` is removed.
- Migration target is Streamable HTTP behavior in stateful flows.

## What This Repository Gives You

- A runnable migration-oriented server in `src/`.
- A scaffold creator CLI:
  - Primary command: `create-mcp-streamable-starter`
  - Compatibility alias: `create-mcp-sse-starter`
- A reusable template starter in `templates/starter-streamable-v2`.
- A docs set focused on v2 migration and practical implementation.

## Quick Start

```bash
npm install
npm run dev
```

Endpoints:

- MCP: `http://127.0.0.1:3000/mcp`
- Health: `http://127.0.0.1:3000/health`

## Scaffold Creator CLI

Generate a new starter project:

```bash
npm run create -- --name my-mcp-server --target ./my-mcp-server
```

Then run it:

```bash
cd my-mcp-server
npm install
npm run dev
```

The generated project includes:

- `src/server/create-mcp-server.ts`
- `src/server/session-registry.ts`
- `src/server/http-server.ts`
- `scripts/smoke.mjs`
- `vendor/` SDK v2 alpha tarballs

## Validate Everything

Root project:

```bash
npm run ci
```

Generated project:

```bash
npm run create -- --name verify --target .generated/verify
cd .generated/verify
npm install
npm run build
npm run typecheck
npm run smoke
```

## Documentation

- `docs/README.md`: docs index and recommended reading order.
- `docs/01_V2_SDK_PRIMER.md`: what changed in v2 and what it means in practice.
- `docs/02_SCAFFOLDER_CLI.md`: exact scaffold workflow and extension guide.
- `docs/03_ARCHITECTURE.md`: server module-by-module design.
- `docs/04_MIGRATION_NOTES.md`: mapping from legacy SSE-era assumptions to v2 style.
- `docs/05_VALIDATION.md`: repeatable verification steps.

## Why SDK Tarballs Are Vendored

In this environment, split v2 package names were not resolvable directly from npm, so this repository pins official v2 alpha artifacts in `vendor/` for reproducible installs.

Refresh process:

```bash
cd ../typescript-sdk
pnpm --filter @modelcontextprotocol/server pack
pnpm --filter @modelcontextprotocol/node pack
pnpm --filter @modelcontextprotocol/client pack
```

Then copy new tarballs into `vendor/` and update:

- `package.json`
- `templates/starter-streamable-v2/package.json`

## Official Sources Used

- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/faq.md
