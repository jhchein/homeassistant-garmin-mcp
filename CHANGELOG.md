# Changelog

## 0.1.0 - Unreleased

- Initial MCP server with the parameterless `get_current_stats` tool.
- Home Assistant REST support for Garmin-derived entities.
- Normalized Current Stats envelope with `status`, `captured_at`, `source`,
  `missing`, `stale`, and `stats`.
- Local smoke check for real Home Assistant connectivity.
- CI gates for typecheck, lint, format, tests, coverage, build, and audit.
