# getting started

set up, run, and verify the MCP Streamable HTTP migration starter.

## prerequisites

- Node.js 20 or later
- npm (ships with Node.js)

no other global tools are required. the SDK v2 alpha packages are vendored locally in `vendor/`.

## install

```bash
git clone https://github.com/yigitkonur/example-mcp-sse.git
cd example-mcp-sse
npm install
```

`npm install` resolves `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, and `@modelcontextprotocol/node` from the tarballs in `vendor/`. no npm registry access is needed for these packages.

## run the server

```bash
npm run dev
```

this uses `tsx` to run `src/server.ts` directly without a build step. the server prints:

```
MCP Streamable HTTP server listening at http://127.0.0.1:3000/mcp
Health endpoint: http://127.0.0.1:3000/health
```

## default endpoints

| endpoint  | method | purpose                                      |
|-----------|--------|----------------------------------------------|
| `/mcp`    | POST   | JSON-RPC request/response (initialize, tools/call, etc.) |
| `/mcp`    | GET    | SSE notification stream for an active session |
| `/mcp`    | DELETE | terminate an active session                  |
| `/health` | GET    | health check, returns `{ ok, activeSessions, sessions }` |
| `/`       | GET    | server metadata (name, transport, endpoint)  |

## environment variables

| variable | default       | description              |
|----------|---------------|--------------------------|
| `PORT`   | `3000`        | TCP port to listen on    |
| `HOST`   | `127.0.0.1`   | bind address             |

the port can also be set via the `--port` CLI flag:

```bash
npm run dev -- --port 4000
```

## quick verify

with the server running, confirm it responds:

```bash
curl http://127.0.0.1:3000/health
```

expected response:

```json
{ "ok": true, "activeSessions": 0, "sessions": [] }
```

to run the full automated smoke test (builds first, then boots the server and calls tools via the SDK client):

```bash
npm run ci
```

to test interactively with the demo client:

```bash
npm run demo:client
```

this connects to `http://127.0.0.1:3000/mcp`, lists tools, calls `calculate` with `7 * 6`, prints the structured result, and terminates the session.

## next steps

- [02-architecture.md](02-architecture.md) -- understand the module layout and request lifecycle
- [03-scaffold-cli.md](03-scaffold-cli.md) -- generate your own project from the template
- [04-sdk-v2-notes.md](04-sdk-v2-notes.md) -- understand v2 SDK changes if migrating from v1
