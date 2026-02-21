# @@PROJECT_NAME@@

@@PROJECT_DESCRIPTION@@

## Changelog

This project is generated from the Streamable HTTP migration starter template in the parent repository.

## Quick Start

```bash
npm install
npm run dev
```

Endpoint: `http://127.0.0.1:3000/mcp`

## Validate

```bash
npm run build
npm run typecheck
npm run smoke
```

## Project Structure

- `src/server/create-mcp-server.ts`: MCP primitive registrations
- `src/server/session-registry.ts`: session/transport lifecycle
- `src/server/http-server.ts`: request routing
- `scripts/smoke.mjs`: baseline runtime check

## Next Steps

1. Add your domain tools/resources/prompts.
2. Replace in-memory persistence for production.
3. Add auth and deployment-specific controls.

## Docs

- `docs/README.md`
- `docs/LEARNING_PATH.md`
