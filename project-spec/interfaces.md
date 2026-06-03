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

## Field Availability

Required current-state fields affect top-level `status`, `missing`, and `stale`.
Expansion fields are opportunistic: include them when Home Assistant exposes
usable values, omit them when absent, and do not mark the envelope `partial`
solely because an expansion field is unavailable.
