# Changelog

## 0.2.0 - 2026-06-29

- Added `get_recent_stats` for read-only Home Assistant History/Recorder Garmin
    stats over a recent day range.
- Added timezone-aware calendar bucketing, UTC fallback for missing or unusable
    Home Assistant timezone values, and DST regression coverage.
- Added factual `watch_training_readiness` alias sourced from
    `morning_training_readiness` while preserving raw readiness fields.
- Documented the recent-stats MCP contract and accepted ADR.
- Declared `zod` as a direct runtime dependency for MCP input validation.
- Accepted a release-specific npm audit exception for dev-only markdownlint
    transitive advisories that are not shipped in the npm tarball.

## 0.1.0 - 2026-06-04

- Initial MCP server with the parameterless `get_current_stats` tool.
- Home Assistant REST support for Garmin-derived entities.
- Normalized Current Stats envelope with `status`, `captured_at`, `source`,
  `missing`, `stale`, and `stats`.
- Local smoke check for real Home Assistant connectivity.
- CI gates for typecheck, lint, format, tests, coverage, build, and audit.
