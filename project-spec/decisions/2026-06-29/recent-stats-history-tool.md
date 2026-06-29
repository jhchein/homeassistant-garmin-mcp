# Recent Stats History Tool

## Status

Accepted.

## Context

The v1 MCP server exposes `get_current_stats` for a current Garmin-derived Home
Assistant snapshot. A Wellbeing Agent now needs short recent trends so training
decisions are not based only on a single current value.

The new behavior must stay within the existing project boundaries: read-only,
on-demand, Home Assistant as the only upstream integration, and factual output
without coaching, analytics, recommendations, or readiness judgments.

The main semantic risk is Training Readiness. Home Assistant can expose both
`sensor.garmin_connect_training_readiness` and
`sensor.garmin_connect_morning_training_readiness`; the watch-visible value may
correspond to the morning field. Consumer agents need both raw fields preserved
and a factual primary alias, not an interpretation.

## Decision

Add a new MCP tool, `get_recent_stats`, instead of changing
`get_current_stats`.

The tool accepts an optional `days` argument, defaults to `7`, and supports
`1` through `28` days. Invalid values return a structured MCP error. The tool
uses Home Assistant History/Recorder data through read-only REST endpoints and
reuses the existing Home Assistant configuration model.

The response returns one normalized item per calendar day in `stats_by_day` and
includes `source.history_source`, `source.range_start`, and
`source.range_end`. Calendar day bucketing uses the Home Assistant timezone when
`/api/config` returns a usable timezone. If `/api/config` returns a missing,
blank, or unusable timezone, UTC is used and documented in the source metadata
and README.

For each entity and day, the selected scalar value is the last valid Home
Assistant state in that day. Unknown, unavailable, empty, or malformed states
are omitted and represented through date-qualified `missing` paths when the
field is required. Optional expansion fields remain opportunistic and do not
make the whole envelope partial when absent.

For recovery data, the response preserves both raw fields when available:

```json
{
  "training_readiness": {},
  "morning_training_readiness": {}
}
```

It also adds a derived factual alias:

```json
{
  "watch_training_readiness": {
    "source_field": "morning_training_readiness"
  }
}
```

`watch_training_readiness` prefers `morning_training_readiness`. Disagreement
between the raw fields is preserved and not interpreted by the MCP server.

Activity fields whose entity names encode `yesterday`, such as
`yesterday_steps` and `yesterday_distance`, are reported as Home Assistant
scalar fields on the day Home Assistant reports them. V2 does not reconstruct
activity-date totals or shift those values to a prior day.

The implementation starts test-first and covers normal history, missing
entities, unknown states, multiple updates per day, sparse days, stale required
fields, invalid `days`, the Training Readiness alias behavior, and the DST
spring-forward boundary.

If `/api/config` returns a missing, blank, or unusable timezone, the server
falls back to UTC for range selection and date grouping.

## Consequences

- `get_current_stats` stays backward-compatible and parameterless.
- Consumer agents can distinguish watch-visible Training Readiness from other
  Garmin/Home Assistant readiness fields.
- The server remains factual and boring; interpretation stays with the
  Wellbeing Agent.
- Home Assistant Recorder retention and entity availability determine how much
  history can be returned.
- Daily activity fields remain reported Garmin/Home Assistant scalars in v2;
  richer activity reconstruction is deferred.
