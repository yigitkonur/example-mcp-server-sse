# sdk v2 notes

v2 SDK package model, what changed from v1, vendoring strategy, and migration checklist.

## v2 packages used

this project depends on three v2 pre-alpha packages, all at version `2.0.0-alpha.0`:

| package | purpose | key exports used |
|---------|---------|-----------------|
| `@modelcontextprotocol/server` | server-side MCP primitives | `McpServer`, `ResourceTemplate`, `isInitializeRequest`, `EventStore` type, `JSONRPCMessage` type, `CallToolResult`/`GetPromptResult`/`ReadResourceResult` types |
| `@modelcontextprotocol/node` | Node.js transport implementations | `NodeStreamableHTTPServerTransport` |
| `@modelcontextprotocol/client` | client-side MCP primitives | `Client`, `StreamableHTTPClientTransport`, `ListToolsResultSchema`, `CallToolResultSchema` |

the client package is used only for smoke tests and the demo client. production server deployments do not need it.

## v1 patterns removed

these v1 patterns are explicitly not used in this project:

| v1 pattern | status in v2 |
|------------|-------------|
| `import { Server } from '@modelcontextprotocol/sdk/server'` | removed. use `McpServer` from `@modelcontextprotocol/server` |
| `import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse'` | removed entirely. no server-side SSE transport in v2 |
| `@modelcontextprotocol/sdk` (monolith package) | split into `server`, `client`, `node` |
| Zod v3 schemas (`import { z } from 'zod'`) | replaced with Zod v4 (`import * as z from 'zod/v4'`) |
| `server.tool()` / `server.resource()` / `server.prompt()` | replaced with `server.registerTool()` / `server.registerResource()` / `server.registerPrompt()` |

## vendoring strategy

the v2 packages are not yet published to npm under their split names. this project vendors the official alpha tarballs in `vendor/`:

```
vendor/
  modelcontextprotocol-server-2.0.0-alpha.0.tgz
  modelcontextprotocol-client-2.0.0-alpha.0.tgz
  modelcontextprotocol-node-2.0.0-alpha.0.tgz
```

`package.json` references these via `file:` protocol:

```json
{
  "@modelcontextprotocol/server": "file:vendor/modelcontextprotocol-server-2.0.0-alpha.0.tgz",
  "@modelcontextprotocol/client": "file:vendor/modelcontextprotocol-client-2.0.0-alpha.0.tgz",
  "@modelcontextprotocol/node": "file:vendor/modelcontextprotocol-node-2.0.0-alpha.0.tgz"
}
```

to refresh the tarballs from the upstream SDK repository:

```bash
cd ../typescript-sdk
pnpm --filter @modelcontextprotocol/server pack
pnpm --filter @modelcontextprotocol/node pack
pnpm --filter @modelcontextprotocol/client pack
```

then copy the `.tgz` files into `vendor/` and update filenames in both `package.json` and `templates/starter-streamable-v2/package.json`.

## migration checklist

use this table to verify a codebase has been fully migrated from v1 to v2:

| check | what to verify |
|-------|---------------|
| no monolith imports | no imports from `@modelcontextprotocol/sdk` anywhere |
| split packages only | all imports use `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, or `@modelcontextprotocol/node` |
| no SSE transport | no references to `SSEServerTransport` in server code |
| Streamable HTTP transport | server uses `NodeStreamableHTTPServerTransport` from `@modelcontextprotocol/node` |
| Zod v4 schemas | all registration schemas use `import * as z from 'zod/v4'` |
| v2 registration APIs | uses `registerTool()`, `registerResource()`, `registerPrompt()` instead of `tool()`, `resource()`, `prompt()` |
| session lifecycle | explicit session creation, tracking, and cleanup via session ID |
| event store | `EventStore` implementation provided for replay support |
| graceful shutdown | process signal handlers close transports and servers cleanly |

## official references

- [TypeScript SDK repository](https://github.com/modelcontextprotocol/typescript-sdk)
- [v2 server documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [v2 client documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md)
- [v1-to-v2 migration guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration.md)
- [FAQ](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/faq.md)

## next steps

- [02-architecture.md](02-architecture.md) -- see how these packages are wired together in the server
- [05-validation.md](05-validation.md) -- verify your migration is complete
- [01-getting-started.md](01-getting-started.md) -- go back to setup if needed
