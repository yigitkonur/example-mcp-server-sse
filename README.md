# example-mcp-sse

migration-focused starter for building MCP servers on Streamable HTTP, replacing the deprecated SSE transport. uses TypeScript SDK v2 pre-alpha.

> part of a series: [stdio](https://github.com/yigitkonur/example-mcp-stdio) · [stateless](https://github.com/yigitkonur/example-mcp-stateless) · [stateful](https://github.com/yigitkonur/example-mcp-stateful) · **sse** (you are here)

## what it does

- runnable Streamable HTTP server with session management, event replay, and graceful shutdown
- scaffold CLI (`create-mcp-streamable-starter` / `create-mcp-sse-starter`) to generate new projects from a proven template
- calculator demo with tools, resources, prompts, and structured output to exercise all MCP primitives
- vendored SDK v2 alpha tarballs for reproducible installs without npm registry dependency
- smoke tests for both the root project and scaffolded output
- CI workflow that validates root build, lint, typecheck, and generated project end-to-end

## quick start

```bash
npm install
npm run dev
```

the server starts at `http://127.0.0.1:3000` with these endpoints:

| endpoint  | method         | purpose                              |
|-----------|----------------|--------------------------------------|
| `/mcp`    | POST           | JSON-RPC request/response            |
| `/mcp`    | GET            | notification stream (stateful SSE)   |
| `/mcp`    | DELETE         | session termination                  |
| `/health` | GET            | health check with active session list|
| `/`       | GET            | server metadata                      |

configure with environment variables or CLI flags:

```bash
PORT=4000 npm run dev
# or
npm run dev -- --port 4000
```

## scaffold cli

generate a new MCP Streamable HTTP project:

```bash
npm run create -- --name my-server --target ./my-server
cd my-server
npm install
npm run dev
```

the generated project includes the full server module structure, vendored SDK tarballs, and its own smoke test. see [docs/03-scaffold-cli.md](docs/03-scaffold-cli.md) for the complete reference.

## documentation

| doc | description |
|-----|-------------|
| [docs/README.md](docs/README.md) | documentation hub and reading order |
| [docs/01-getting-started.md](docs/01-getting-started.md) | prerequisites, install, run, verify |
| [docs/02-architecture.md](docs/02-architecture.md) | module layout, request lifecycle, design rationale |
| [docs/03-scaffold-cli.md](docs/03-scaffold-cli.md) | CLI reference, generated structure, extension workflow |
| [docs/04-sdk-v2-notes.md](docs/04-sdk-v2-notes.md) | v2 packages, migration checklist, vendoring strategy |
| [docs/05-validation.md](docs/05-validation.md) | root and generated project validation, release checklist |

## sdk v2 context

this project targets the MCP TypeScript SDK v2 pre-alpha (`2.0.0-alpha.0`). v2 splits the monolithic `@modelcontextprotocol/sdk` into `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, and `@modelcontextprotocol/node`. the server-side `SSEServerTransport` is removed; `NodeStreamableHTTPServerTransport` from `@modelcontextprotocol/node` is the replacement. v1.x remains the stable production recommendation from the upstream project. vendored tarballs in `vendor/` pin the exact alpha artifacts for reproducible builds.

## license

MIT
