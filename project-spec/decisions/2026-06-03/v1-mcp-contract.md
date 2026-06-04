# V1 MCP Contract

## Status

Accepted.

## Context

The server needs to expose Garmin-derived Home Assistant stats to
MCP-compatible agents without becoming a coaching engine or a second Garmin
integration. The public repo should be reusable and neutral, while the first
consumer can still be a private check-in workflow.

Options considered:

- Expose raw Home Assistant entities and let agents know all entity IDs.
- Expose a purpose-built stats tool.
- Build on the existing non-compatible Home Assistant HTTP/SSE bridge.
- Build a new true MCP server.

## Decision

Build a new TypeScript/Node stdio MCP server named `homeassistant-garmin-mcp`.

Expose one v1 tool:

```json
{
  "name": "get_current_stats",
  "arguments": {}
}
```

The tool returns a stable factual envelope with `status`, `captured_at`,
`source`, `missing`, `stale`, and `stats`.

Top-level status reflects required current-state fields. Expansion stats such
as fitness, activity, and body composition are included when available but do
not make the envelope partial when absent.

The server is read-only, on-demand, and Home Assistant is the only upstream
integration boundary.

The response must not contain coaching recommendations, analytics,
interpretations, caveats, or readiness judgments.

## Consequences

- The server stays small and public-ready.
- Consumer agents own interpretation.
- New current Garmin fields can be added under `stats` without changing the
  top-level envelope.
- Historical/range behavior should become a separate future tool if needed.
- Users configure Home Assistant URL and token locally; no secrets belong in
  the repository.
