# 04 - Migration Notes

## Purpose

Map legacy assumptions to the v2 migration model used in this repository.

## Legacy To V2 Mapping

| Legacy assumption                                  | v2 migration model                                        |
| -------------------------------------------------- | --------------------------------------------------------- |
| Server should expose `SSEServerTransport` directly | Use Streamable HTTP model with explicit session lifecycle |
| One large server file is acceptable                | Separate domain, transport lifecycle, and HTTP wiring     |
| Framework and transport concerns can stay mixed    | Keep module boundaries explicit for safer change          |

## Checklist

- No `@modelcontextprotocol/sdk` imports.
- No server-side `SSEServerTransport` usage.
- Split packages only (`server`, `client`, `node`).
- Zod v4 schema objects for registration APIs.
- Deterministic cleanup/shutdown behavior.

## Repository Position

This repository intentionally optimizes for migration clarity over abstraction complexity.

## Related Docs

- Previous: `03_ARCHITECTURE.md`
- Next: `05_VALIDATION.md`
