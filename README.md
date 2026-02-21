# MCP v2 Streamable HTTP Migration Starter

A professional, migration-focused starter for building MCP servers on top of the official TypeScript SDK v2 pre-alpha primitives.

## Changelog (Latest First)

- `2026-02-21`: Major rewrite for upcoming TypeScript SDK v2.
  - Migrated from v1-style monolith to modular Streamable HTTP architecture.
  - Added scaffold CLI and reusable project template.
  - Added root and generated-project smoke validation.
  - Removed legacy server-side `SSEServerTransport` usage.
- Full history: `CHANGELOG.md`

## Start Here

1. Read `docs/README.md`.
2. Run the root server.
3. Generate a scaffolded project.
4. Validate both root and generated projects.

## v2 SDK Status (As Of February 21, 2026)

- The official `typescript-sdk` `main` branch documents v2 pre-alpha APIs.
- v1.x remains the stable production recommendation.
- Server-side legacy `SSEServerTransport` is removed in v2.
- Migration target is Streamable HTTP behavior in stateful flows.

## Repository Scope

This repository provides:

- A runnable migration-oriented server in `src/`.
- A scaffold creator CLI:
  - Primary command: `create-mcp-streamable-starter`
  - Compatibility alias: `create-mcp-sse-starter`
- A reusable template in `templates/starter-streamable-v2`.
- Structured documentation in `docs/`.

## Quick Start (Root Project)

```bash
npm install
npm run dev
```

Endpoints:

- MCP: `http://127.0.0.1:3000/mcp`
- Health: `http://127.0.0.1:3000/health`

## Scaffold Creator CLI

Generate a new project:

```bash
npm run create -- --name my-mcp-server --target ./my-mcp-server
```

Run generated project:

```bash
cd my-mcp-server
npm install
npm run dev
```

Generated project includes:

- `src/server/create-mcp-server.ts`
- `src/server/session-registry.ts`
- `src/server/http-server.ts`
- `scripts/smoke.mjs`
- `vendor/` SDK v2 alpha tarballs

## Validation

Root:

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

Detailed validation guide: `docs/05_VALIDATION.md`

## Documentation Map

- `docs/README.md`: documentation hub and reading order
- `docs/01_V2_SDK_PRIMER.md`: v2 SDK changes and practical impact
- `docs/02_SCAFFOLDER_CLI.md`: scaffold CLI usage and extension model
- `docs/03_ARCHITECTURE.md`: module-by-module architecture and request lifecycle
- `docs/04_MIGRATION_NOTES.md`: migration mapping from legacy assumptions
- `docs/05_VALIDATION.md`: repeatable verification workflows

## Vendored SDK Tarballs

In this environment, split v2 package names were not resolvable directly from npm, so this repository pins official v2 alpha artifacts in `vendor/` for reproducible installs.

Refresh flow:

```bash
cd ../typescript-sdk
pnpm --filter @modelcontextprotocol/server pack
pnpm --filter @modelcontextprotocol/node pack
pnpm --filter @modelcontextprotocol/client pack
```

After packing, update tarballs in `vendor/` and update filenames in:

- `package.json`
- `templates/starter-streamable-v2/package.json`

## Official Sources

- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration.md
- https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/faq.md
