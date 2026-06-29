# Interfaces

API and auth contracts. This file records signatures and shapes only.

## MCP Tool: `get_current_stats`

Input:

```json
{}
```

Output:

```json
{
  "status": "full | partial | stale | unavailable",
  "captured_at": "ISO-8601 timestamp",
  "source": {
    "system": "home_assistant",
    "integration": "garmin_connect",
    "last_synced": "ISO-8601 timestamp or null"
  },
  "missing": ["stats.path"],
  "stale": ["stats.path"],
  "stats": {
    "sleep": {},
    "recovery": {},
    "hrv": {},
    "cardio": {},
    "stress": {},
    "body_battery": {},
    "activity": {},
    "fitness": {},
    "body_composition": {},
    "time_series": {}
  }
}
```

## MCP Tool: `get_recent_stats`

Input:

```json
{
  "days": 7
}
```

`days` is optional, defaults to `7`, and must be an integer in the inclusive
range `1..28`. Invalid values are rejected by the MCP input schema as a
structured error before the tool executes.

Output:

```json
{
  "status": "full | partial | stale | unavailable",
  "captured_at": "ISO-8601 timestamp",
  "source": {
    "system": "home_assistant",
    "integration": "garmin_connect",
    "history_source": "home_assistant_recorder",
    "time_zone": "IANA time zone string or UTC fallback",
    "range_start": "ISO-8601 timestamp",
    "range_end": "ISO-8601 timestamp"
  },
  "missing": ["stats_by_day.YYYY-MM-DD.section.field"],
  "stale": ["stats_by_day.YYYY-MM-DD.section.field"],
  "stats_by_day": [
    {
      "date": "YYYY-MM-DD",
      "sleep": {},
      "recovery": {
        "training_readiness": {},
        "morning_training_readiness": {},
        "watch_training_readiness": {
          "source_field": "morning_training_readiness"
        }
      },
      "hrv": {},
      "cardio": {},
      "stress": {},
      "body_battery": {},
      "activity": {},
      "fitness": {},
      "body_composition": {}
    }
  ]
}
```

`stats_by_day` is the top-level day bucket array. Each day contains factual
values only. `watch_training_readiness` is a derived alias for the raw
`morning_training_readiness` value; `training_readiness` and
`morning_training_readiness` are distinct source fields and both should be
preserved when present.

The server reads Home Assistant history through the Recorder-backed history
API. If `/api/config` returns a missing, blank, or unusable timezone, the
server falls back to UTC for date grouping and range selection.

## Home Assistant REST

Required configuration values, read first from explicit environment variables,
then from `HA_ENV_FILE` when set, and then from a local `.env` fallback:

- `HA_URL`: Home Assistant base URL, no trailing slash required.
- `HA_TOKEN`: Home Assistant long-lived access token.

Optional environment variables:

- `HA_ENV_FILE`: path to an env file containing Home Assistant settings.
- `HA_REQUEST_TIMEOUT_MS`: request timeout, default `10000`.
- `HA_STALE_AFTER_HOURS`: freshness threshold, default `24`.

Endpoint used in v1:

```http
GET /api/states
Authorization: Bearer <HA_TOKEN>

GET /api/config
Authorization: Bearer <HA_TOKEN>

GET /api/history/period/{start_time}
Authorization: Bearer <HA_TOKEN>
```

## Field Value Shape

Stats fields should use this factual shape where practical:

```json
{
  "value": 76,
  "unit": null,
  "entity_id": "sensor.sleep_score",
  "last_changed": "ISO-8601 timestamp",
  "last_updated": "ISO-8601 timestamp"
}
```

The MCP server must not add interpretation fields.

Recent stats values reuse the same shape, nested under `stats_by_day` with one
day bucket per local calendar day.

## Field Availability

Required current-state fields affect top-level `status`, `missing`, and `stale`.
Expansion fields are opportunistic: include them when Home Assistant exposes
usable values, omit them when absent, and do not mark the envelope `partial`
solely because an expansion field is unavailable.
