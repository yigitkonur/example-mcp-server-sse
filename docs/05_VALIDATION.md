# 05 - Validation

## Purpose

Provide repeatable validation steps for both root and scaffolded projects.

## Root Validation

```bash
npm install
npm run ci
```

`npm run ci` validates:

- typecheck
- lint
- format
- build
- smoke test

## Generated Project Validation

```bash
npm run create -- --name validate --target .generated/validate
cd .generated/validate
npm install
npm run build
npm run typecheck
npm run smoke
```

## MCP CLI Validation Pattern

Use this flow when testing an HTTP MCP server:

```bash
mcp-cli -c /path/to/mcp_servers.json info my-server
mcp-cli -c /path/to/mcp_servers.json info my-server my-tool
mcp-cli -c /path/to/mcp_servers.json call my-server my-tool '{"valid":"input"}'
mcp-cli -c /path/to/mcp_servers.json call my-server my-tool '{}'
MCP_NO_DAEMON=1 mcp-cli -c /path/to/mcp_servers.json call my-server my-tool '{"valid":"input"}'
```

## Expected Outcome

- Root and generated smoke tests succeed.
- Tool calls succeed for valid input.
- Invalid input returns graceful MCP errors without server crash.

## Related Docs

- Previous: `04_MIGRATION_NOTES.md`
