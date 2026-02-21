# 02 - Scaffold Creator CLI

## Command

Primary scaffold command:

```bash
npm run create -- --name my-server --target ./my-server
```

This executes:

- `src/cli/create-mcp-streamable-starter.ts`

Binary names:

- `create-mcp-streamable-starter` (primary)
- `create-mcp-sse-starter` (compatibility alias)

## What It Generates

Target project includes:

- `src/server/create-mcp-server.ts`
- `src/server/session-registry.ts`
- `src/server/http-server.ts`
- `scripts/smoke.mjs`
- `vendor/` SDK tarballs

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

1. Add or modify tools in `src/server/create-mcp-server.ts`.
2. Keep routing and session lifecycle in `src/server/http-server.ts` and `src/server/session-registry.ts`.
3. Replace in-memory event store with persistent storage for production.
