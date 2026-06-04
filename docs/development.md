# Development Contract

This repo is built for agentic development. We keep behavior protected by
tests, keep module Interfaces small, and avoid hidden product drift in helper
code.

## Product Boundaries

`get_current_stats` must stay parameterless. Future tools may use parameters
when the operation naturally needs them, such as a time range or lookup key.

The MCP server returns factual Garmin-derived Home Assistant data only. It must
not return coaching, analytics, caveats, readiness judgments, or
recommendations.

V1 stays read-only and on-demand. Do not add direct Garmin authentication,
writes, a cache, a database, a scheduler, background polling, or hosted
infrastructure.

## Module Rules

The Home Assistant Adapter owns the Home Assistant seam. Its Interface is
`fetchHomeAssistantStates(config): Promise<HomeAssistantState[]>`.

That Adapter must handle HTTP, timeout behavior, JSON parsing, top-level payload
validation, per-entry validation, and sanitized Home Assistant errors. Callers
should receive only usable Home Assistant state entries.

The normalizer owns current-stats classification: `missing`, `stale`, optional
expansion fields, and top-level `status`. The MCP tool layer owns tool
registration and response formatting.

## Home Assistant State Handling

Malformed individual state entries are silently discarded. Valid entries are
preserved. A malformed top-level `/api/states` payload is a Home Assistant
failure.

A state entry is valid when it has a non-empty string `entity_id`, string
`state`, string `last_changed`, and string `last_updated`. Missing or invalid
`attributes` are coerced to `{}`. Unknown states and invalid timestamp strings
are left for normalization to classify.

## TDD Rules

Behavior changes must start with a failing test. Tests should exercise public
Interfaces, not private helpers. Mock only system seams such as `fetch`, time,
or the filesystem.

Use one tracer bullet at a time: red, green, then refactor. `npm run smoke`
checks a real Home Assistant instance, but it does not replace automated tests.

Real Home Assistant smoke checks stay local/manual because they require secrets
and may expose personal data. CI-safe smoke behavior should be tested with fake
Home Assistant responses, including envelope output and sanitized diagnostics.

## Coverage Gate

Coverage is a guardrail for agentic coding. It does not justify brittle tests
that assert implementation details.

The coverage gate is:

- statements: 90
- branches: 85
- functions: 90
- lines: 90

## Security And Diagnostics

Never commit real Home Assistant URLs, tokens, or private examples. MCP
`unavailable` output stays bland. Smoke and development output may be more
diagnostic, but must stay sanitized.

Raw Home Assistant payloads, tokens, URLs, and low-level request details must
not appear in thrown errors or MCP responses.

## Verification

Run these checks before treating a behavior change as done:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
npm audit --audit-level=moderate
```

Use `npm run lint:fix` for safe local auto-fixes before rerunning the checks.

Use `npm run smoke` only when validating local Home Assistant connectivity.
