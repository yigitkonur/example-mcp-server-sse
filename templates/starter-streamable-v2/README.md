# **PROJECT_NAME**

**PROJECT_DESCRIPTION**

## What this includes

- MCP server built with official TypeScript SDK v2 pre-alpha primitives.
- Streamable HTTP endpoint at `/mcp` in stateful mode for migration-friendly notification streaming behavior.
- Session registry and in-memory replay store for learning reconnect/resume flows.

## Quick start

```bash
npm install
npm run dev
```

Server endpoint: `http://127.0.0.1:3000/mcp`

## Validate

```bash
npm run build
npm run typecheck
npm run smoke
```

## Edit first

- `src/server/create-mcp-server.ts`
- `src/server/http-server.ts`
- `src/server/session-registry.ts`

## Note

This starter uses vendored SDK alpha tarballs in `vendor/` because split v2 package names may not yet resolve in every npm registry environment.
