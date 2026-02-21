# validation

repeatable verification workflows for the root project, generated projects, and release readiness.

## root project validation

run the full CI pipeline locally:

```bash
npm run ci
```

this executes the following in order:

1. `npm run typecheck` -- TypeScript type checking (`tsc --noEmit`)
2. `npm run lint:ci` -- ESLint with zero warnings allowed
3. `npm run format:check` -- Prettier format verification
4. `npm run build` -- compile to `dist/`
5. `npm run smoke:server` -- boot compiled server, connect SDK client, call `calculate` tool, verify `2 + 3 = 5`, terminate session

each step must pass before the next runs. if any step fails, the pipeline stops.

to run individual checks:

```bash
npm run typecheck      # type checking only
npm run lint           # lint (warnings allowed)
npm run format:check   # format check only
npm run build          # build only
npm run smoke:server   # smoke test only (requires build first)
```

## generated project validation

scaffold a fresh project and validate it end-to-end:

```bash
npm run create -- --name validate --target .generated/validate
cd .generated/validate
npm install
npm run build
npm run typecheck
npm run smoke
```

the generated smoke test (`scripts/smoke.mjs`) boots the compiled server, connects a client, calls the `echo` tool with `"hello"`, verifies the echoed result, and terminates the session.

this same flow runs in CI (`.github/workflows/ci.yml`) on every push to `main` and every pull request.

## mcp-cli verification flow

for manual testing against any running MCP HTTP server, use `mcp-cli`:

```bash
# list server capabilities
mcp-cli -c /path/to/mcp_servers.json info my-server

# inspect a specific tool
mcp-cli -c /path/to/mcp_servers.json info my-server calculate

# call a tool with valid input
mcp-cli -c /path/to/mcp_servers.json call my-server calculate '{"operation":"add","left":2,"right":3}'

# call a tool with empty input (should return validation error)
mcp-cli -c /path/to/mcp_servers.json call my-server calculate '{}'

# call without daemon mode (direct connection)
MCP_NO_DAEMON=1 mcp-cli -c /path/to/mcp_servers.json call my-server calculate '{"operation":"multiply","left":4,"right":5}'
```

example `mcp_servers.json` for this project:

```json
{
  "my-server": {
    "transport": "streamable-http",
    "url": "http://127.0.0.1:3000/mcp"
  }
}
```

## primitive-level checks

beyond tool calls, verify that all MCP primitives work correctly:

| primitive | how to verify |
|-----------|--------------|
| tools | `tools/list` returns `calculate` and `history-summary`; `tools/call` on `calculate` returns structured output with `id`, `result`, `formula` |
| resources | `resources/list` returns `calc://history`; after a calculation, `resources/read` on `calc://history` returns the history array |
| resource templates | `resources/templates/list` returns `calc://history/{id}`; `resources/read` on `calc://history/calc_1` returns a single record |
| prompts | `prompts/list` returns `explain-calculation`; `prompts/get` with `formula: "2 + 3 = 5"` returns a user message |
| sessions | verify `mcp-session-id` header is returned on initialize; subsequent requests with the header hit the same session state |
| event replay | connect via GET, disconnect, reconnect with `Last-Event-ID`, verify missed events are replayed |
| health | `GET /health` returns `{ ok: true, activeSessions: N, sessions: [...] }` |

the demo client (`npm run demo:client`) exercises tool listing and calling but does not cover resources, prompts, or event replay.

## release checklist

before tagging a release:

- [ ] `npm run ci` passes locally
- [ ] generated project validates (`npm run create` + build + smoke)
- [ ] CI workflow passes on GitHub (push to `main` or PR)
- [ ] vendored tarballs in `vendor/` match the SDK version referenced in code
- [ ] `package.json` version is updated
- [ ] `CHANGELOG.md` is updated
- [ ] template `package.json` (`templates/starter-streamable-v2/package.json`) references the same vendored tarball filenames

## next steps

- [01-getting-started.md](01-getting-started.md) -- go back to setup
- [04-sdk-v2-notes.md](04-sdk-v2-notes.md) -- review SDK migration checklist
- [02-architecture.md](02-architecture.md) -- review module design
