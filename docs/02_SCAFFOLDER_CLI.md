# 02 - Scaffold Creator CLI

## Purpose

Document exactly how to generate, run, and extend starter projects from this repository.

## Commands

Primary scaffold command:

```bash
npm run create -- --name my-server --target ./my-server
```

CLI entrypoints:

- `create-mcp-streamable-starter` (primary)
- `create-mcp-sse-starter` (compatibility alias)

Implementation file:

- `src/cli/create-mcp-streamable-starter.ts`

## Generated Structure

The scaffolded project includes:

- `src/server/create-mcp-server.ts`
- `src/server/session-registry.ts`
- `src/server/http-server.ts`
- `scripts/smoke.mjs`
- `vendor/` tarballs for SDK v2 alpha dependencies

## Run Generated Project

```bash
cd my-server
npm install
npm run dev
```

## Validate Generated Project

```bash
npm run build
npm run typecheck
npm run smoke
```

## Extension Workflow

1. Add domain tools/resources/prompts in `src/server/create-mcp-server.ts`.
2. Keep session/transport lifecycle logic in `src/server/session-registry.ts`.
3. Keep HTTP method routing in `src/server/http-server.ts`.
4. Replace in-memory event storage with persistent storage for production.

## Related Docs

- Previous: `01_V2_SDK_PRIMER.md`
- Next: `03_ARCHITECTURE.md`
