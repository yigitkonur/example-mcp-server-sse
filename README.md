reference MCP server implementation using the deprecated SSE (server-sent events) transport. exposes a calculator domain — arithmetic, history, stats, prompts — over the two-endpoint SSE pattern (`GET /sse` + `POST /messages`). built as a teaching tool, not a production service.

part of a series: [STDIO](https://github.com/yigitkonur/example-mcp-server-stdio) | [stateful HTTP](https://github.com/yigitkonur/example-mcp-server-http-stateful) | [stateless HTTP](https://github.com/yigitkonur/example-mcp-server-http-stateless) | **SSE** (you are here)

```bash
npm run dev
# server on http://localhost:1923
# connect MCP Inspector: npx @modelcontextprotocol/inspector --cli http://localhost:1923/sse
```

[![typescript](https://img.shields.io/badge/typescript-5.3+-93450a.svg?style=flat-square)](https://www.typescriptlang.org/)
[![node](https://img.shields.io/badge/node-20+-93450a.svg?style=flat-square)](https://nodejs.org/)
[![license](https://img.shields.io/badge/license-MIT-grey.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## why SSE

the SSE transport is deprecated in the MCP spec (protocol version 2024-11-05). it exists here for backward compatibility with MCP Inspector and older clients that don't support streamable HTTP yet. if you're starting fresh, use the [stateful HTTP](https://github.com/yigitkonur/example-mcp-server-http-stateful) variant instead.

the two-endpoint pattern:

- `GET /sse` — opens a persistent SSE stream, server assigns a `sessionId`
- `POST /messages?sessionId=<id>` — client sends JSON-RPC messages back

all clients share a singleton `McpServer` instance. calculation history is global across sessions, stored in-memory.

---

## what it exposes

### tools (7)

| tool | what it does |
|:---|:---|
| `calculate` | basic arithmetic (`add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`) with configurable precision. stores results in shared history |
| `batch_calculate` | array of operations in one call. partial failures don't kill the batch |
| `advanced_calculate` | evaluates arbitrary math expressions with variable substitution. uses `new Function()` — **intentionally unsafe, demo only** |
| `solve_math_problem` | parses natural language math ("solve for x", "what is 2+2"). regex-based, not an AI |
| `explain_formula` | looks up known formulas (pythagorean theorem, E=mc², F=ma, circle area) and returns structured explanations |
| `calculator_assistant` | natural language dispatcher — routes "help", "history", "calculate" intents |
| `demo_progress` | demonstrates MCP progress notifications. echoes back client-provided `progressToken`, sends 5 updates at 20% intervals |

a conditional 8th tool is registered if `SAMPLE_TOOL_NAME` env var is set — simple echo tool for demonstrating dynamic registration.

### resources (3)

| resource | URI | description |
|:---|:---|:---|
| constants | `calculator://constants` | pi, e, phi, sqrt2, ln2, ln10 |
| history | `calculator://history/{id}` | templated — query by UUID, limit (`/10`, `/50`), or `/all` |
| stats | `calculator://stats` | total calculations, per-operation counts, calculations/minute |

### prompts (3)

| prompt | description |
|:---|:---|
| `explain-calculation` | asks LLM to explain a math expression at elementary/intermediate/advanced level |
| `generate-problems` | generates practice problems based on topic and difficulty, incorporates recent history |
| `calculator-tutorial` | generates tutorials for basic ops, advanced features, or tips |

---

## install

```bash
git clone https://github.com/yigitkonur/example-mcp-server-sse.git
cd example-mcp-server-sse
npm install
```

### configure

copy `.env.example` to `.env`:

```env
PORT=1923
CORS_ORIGIN=*
NODE_ENV=development
```

### run

```bash
# development (tsx, no compile step)
npm run dev

# production
npm run build && npm start

# docker
docker compose --profile prod up

# docker dev (hot-reload, mounts src/)
docker compose --profile dev up
```

### connect with MCP Inspector

```bash
npm run inspector
# or manually:
npx @modelcontextprotocol/inspector --cli http://localhost:1923/sse
```

---

## scripts

| script | what it does |
|:---|:---|
| `dev` | run with tsx (no compile) |
| `build` | compile TypeScript to `dist/` |
| `start` | run compiled output |
| `typecheck` | `tsc --noEmit` |
| `lint` / `lint:fix` / `lint:ci` | ESLint (ci = zero warnings allowed) |
| `format` / `format:check` | Prettier |
| `check:quick` | typecheck + lint + format check |
| `pipeline` | clean + typecheck + lint + format + build |
| `smoke:http` | spawn server, verify `/sse` responds |
| `ci` | full pipeline + smoke tests |

---

## project structure

```
src/
  server.ts    — express app, SSE transport setup, all tools/resources/prompts
  types.ts     — zod schemas, TypeScript interfaces, math constants
```

singleton architecture: `createCalculatorServer()` is called once at startup. every SSE client connects a new transport to the same `McpServer`. history array lives in the closure — shared across all sessions, lost on restart.

---

## implementation notes

things worth reading in the source if you're learning MCP:

- **void IIFE pattern** — express handlers are sync, MCP operations are async. the codebase uses `void (async () => { ... })()` consistently to bridge this without floating promises
- **progress notifications** — `demo_progress` shows the correct pattern: server never invents a `progressToken`, only echoes back what the client sent
- **two-tier errors** — `InvalidParams` for bad user input, `InternalError` for non-finite computation results
- **graceful shutdown** — SIGINT/SIGTERM close all transports, then the HTTP server, with a 5s force-exit fallback
- **maximally strict tsconfig** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`

---

## CI

GitHub Actions on push to `main` and all PRs:

```
checkout → node 22 → npm ci → typecheck → lint:ci → format:check → build
```

---

## docker

multi-stage build: `node:20-alpine` builder compiles TypeScript, production stage copies `dist/` with only production deps.

```bash
# production
docker compose --profile prod up

# development (hot-reload)
docker compose --profile dev up
```

port defaults to `1923`. override with `PORT` env var.

---

## known quirks

- `uuid` package is installed but unused — `randomUUID` comes from `node:crypto`
- `/health` endpoint reports `"transport": "streamableHttp"` but the actual transport is SSE
- `types.ts` defines schemas with different field names (`operation`, `input_1`, `input_2`) than the actual tools use (`op`, `a`, `b`) — leftover from an earlier iteration
- `advanced_calculate` and `solve_math_problem` use `new Function()` eval — explicitly documented as unsafe, intentionally included as a "what not to do" example

## license

MIT
