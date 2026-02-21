# Changelog

## 2026-02-21 - Major Rewrite for Upcoming TypeScript SDK v2

### Added

- Streamable HTTP migration starter CLI (`create-mcp-streamable-starter`) with compatibility alias (`create-mcp-sse-starter`).
- Starter template under `templates/starter-streamable-v2`.
- Root and template smoke tests.
- Learning and migration docs in `docs/`.

### Changed

- Full architecture rewrite from monolithic implementation to modular server structure.
- Repositioned project from "SSE v2 server" messaging to "v2 Streamable HTTP migration" messaging.
- Dependency model now pins official v2 alpha SDK tarballs under `vendor/` for reproducible installs.

### Removed

- v1-oriented boilerplate and oversized legacy single-file server design.
- Old container/smithery artifacts that no longer matched the migration-focused scope.
