# homeassistant-garmin-mcp

Minimal MCP server that exposes Garmin-derived stats from Home Assistant.

The v1 server provides one read-only tool, `get_current_stats`, that returns
factual normalized Garmin/Home Assistant data. It does not write data, cache
data, interpret readiness, or make recommendations.

## Requirements

- Node.js 20+
- npm
- Home Assistant with Garmin Connect entities available
- Home Assistant long-lived access token

## Install

```bash
npm install
```

## Configure

Use `.env.example` as a template for local development:

```bash
cp .env.example .env
```

Set:

```env
HA_URL=https://home-assistant.example.com
HA_TOKEN=replace-with-home-assistant-token
HA_REQUEST_TIMEOUT_MS=10000
HA_STALE_AFTER_HOURS=24
```

Never commit `.env` or real tokens. The server reads explicit environment
variables first, then falls back to `HA_ENV_FILE` when set, and then to a local
`.env` file in the current working directory. MCP clients can point `HA_ENV_FILE`
at a secret file without embedding `HA_URL` or `HA_TOKEN` in their config.

## Run locally

```bash
npm run build
npm start
```

Run a local smoke test with `.env`:

```powershell
Remove-Item Env:HA_URL -ErrorAction SilentlyContinue
Remove-Item Env:HA_TOKEN -ErrorAction SilentlyContinue
npm run smoke
```

The `Remove-Item` lines only matter when the current PowerShell session already
has old values set. Explicit shell variables override `.env`.

To test without writing secrets to a file, set the values in the current
PowerShell session:

```powershell
$env:HA_URL="https://home-assistant.example.com"
$env:HA_TOKEN="paste-token-here"
npm run smoke
```

For an MCP client launched from another workspace, pass an env-file pointer:

```json
{
  "env": {
    "HA_ENV_FILE": "C:/code/mcp/homeassistant-garmin-mcp/.env"
  }
}
```

The smoke command prints the same normalized envelope that the MCP tool returns.

If the smoke test reports `HTTP 401` or `HTTP 403`, Home Assistant is reachable
but the token was rejected. Create a fresh Home Assistant long-lived access
token, set `HA_TOKEN` again in the same shell, and rerun `npm run smoke`.

Start the stdio MCP server directly:

```powershell
npm start
```

Stop the server with `Ctrl+C` after the MCP client test is complete.

For development:

```bash
npm run dev
```

## Typecheck and test

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## MCP client configuration

This package is not published to npm yet. For now, use a local checkout. After
running `npm run build`, point the MCP config at the ignored local `.env` file:

```json
{
  "servers": {
    "homeassistant-garmin": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/homeassistant-garmin-mcp/dist/index.js"],
      "env": {
        "HA_ENV_FILE": "/absolute/path/to/homeassistant-garmin-mcp/.env"
      }
    }
  }
}
```

If your MCP client has its own secret handling, pass direct environment
variables instead of an env-file pointer:

```json
{
  "servers": {
    "homeassistant-garmin": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/homeassistant-garmin-mcp/dist/index.js"],
      "env": {
        "HA_URL": "https://home-assistant.example.com",
        "HA_TOKEN": "replace-with-home-assistant-token"
      }
    }
  }
}
```

Once the package is published to npm, the same server can be run via `npx`:

```json
{
  "servers": {
    "homeassistant-garmin": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@jhchein/homeassistant-garmin-mcp"],
      "env": {
        "HA_URL": "https://home-assistant.example.com",
        "HA_TOKEN": "replace-with-home-assistant-token"
      }
    }
  }
}
```

## Tool

### `get_current_stats`

Input:

```json
{}
```

Output envelope:

```json
{
  "status": "full",
  "captured_at": "2026-06-03T17:24:00.000Z",
  "source": {
    "system": "home_assistant",
    "integration": "garmin_connect",
    "last_synced": "2026-06-03T17:23:10.000Z"
  },
  "missing": [],
  "stale": [],
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

`status`, `missing`, and `stale` describe required current-state fields.
Expansion stats such as fitness, activity, and body composition are included
when Home Assistant exposes them, but absent expansion fields do not make the
envelope partial.

## Boundaries

- Home Assistant is the only upstream integration boundary.
- The server is read-only and on-demand.
- The server returns factual normalized data only.
- The server does not include analytics, interpretations, caveats, readiness
  judgments, or recommendations.
- Unknown or unavailable Home Assistant states are reported through `missing` or
  `stale` rather than passed through as useful stats.

## Development notes

Project context lives in `project-spec/`.

- `docs/development.md` — development contract, TDD rules, and verification
- `project-spec/project.md` — goals, stack, and non-goals
- `project-spec/interfaces.md` — tool and auth contracts
- `project-spec/constraints.md` — security, privacy, and networking rules
- `project-spec/decisions/` — architecture decisions
- `CONTEXT.md` — domain vocabulary
