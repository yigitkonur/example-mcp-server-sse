# documentation

reference docs for the MCP SSE-to-Streamable-HTTP migration starter, covering setup, architecture, scaffolding, SDK migration, and validation.

## reading order

1. [`01-getting-started.md`](01-getting-started.md) -- prerequisites, install, run, and verify the server
2. [`02-architecture.md`](02-architecture.md) -- module layout, request lifecycle, and design rationale
3. [`03-scaffold-cli.md`](03-scaffold-cli.md) -- CLI reference for generating new projects from the template
4. [`04-sdk-v2-notes.md`](04-sdk-v2-notes.md) -- v2 package model, migration checklist, and vendoring strategy
5. [`05-validation.md`](05-validation.md) -- validation workflows for root and generated projects

## audience guide

- **new users**: start with 01, then 03
- **migrating from v1**: read 04, then 02
- **maintainers**: 02 + 05
