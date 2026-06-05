# homeassistant-garmin-mcp

[![CI](https://github.com/jhchein/homeassistant-garmin-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/jhchein/homeassistant-garmin-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@jhchein/homeassistant-garmin-mcp)](https://www.npmjs.com/package/@jhchein/homeassistant-garmin-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Minimal MCP server that exposes Garmin-derived stats from Home Assistant.

The v1 server provides one read-only tool, `get_current_stats`, that returns
factual normalized Garmin/Home Assistant data. It does not write data, cache
data, interpret readiness, or make recommendations.

## Requirements

- Node.js 20+
- npm
- Home Assistant with Garmin Connect entities available
- Home Assistant long-lived access token

## Quick start

The server is published on npm as
[`@jhchein/homeassistant-garmin-mcp`](https://www.npmjs.com/package/@jhchein/homeassistant-garmin-mcp).
Most MCP clients can launch it with `npx`, so you do not need a local checkout.
Add a stdio server entry and pass your Home Assistant URL and a long-lived access
token:

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

To keep secrets out of the client config, point `HA_ENV_FILE` at a separate env
file instead of setting `HA_URL` and `HA_TOKEN` inline:

```json
{
  "servers": {
    "homeassistant-garmin": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@jhchein/homeassistant-garmin-mcp"],
      "env": {
        "HA_ENV_FILE": "/absolute/path/to/homeassistant-garmin-mcp/.env"
      }
    }
  }
}
```

## Configuration

The server reads its config from environment variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `HA_URL` | yes | none | Base URL of your Home Assistant instance |
| `HA_TOKEN` | yes | none | Home Assistant long-lived access token |
| `HA_REQUEST_TIMEOUT_MS` | no | `10000` | Request timeout in milliseconds |
| `HA_STALE_AFTER_HOURS` | no | `24` | Age after which a reading is stale |

Values resolve in a fixed order: an explicit environment variable wins, then a
file named by `HA_ENV_FILE`, then a local `.env` file in the working directory.
Never commit `.env` or a real token.

## Local development

Clone the repository and install dependencies:

```bash
npm install
```

Copy the example env file and fill in your Home Assistant details:

```bash
cp .env.example .env
```

Build the server and start it over stdio:

```bash
npm run build
npm start
```

Stop the server with `Ctrl+C` once your MCP client test is done. To rebuild on
every edit, run `npm run dev` instead.

The smoke script runs the same code path as the `get_current_stats` tool and
prints the normalized envelope, which makes it the fastest way to check Home
Assistant connectivity:

```bash
npm run smoke
```

By default the smoke script reads `HA_URL` and `HA_TOKEN` from `.env`. An explicit
shell variable always wins over the file, so clear any leftover `HA_URL` or
`HA_TOKEN` from your session when you mean to use `.env`. A reported `HTTP 401`
or `HTTP 403` means Home Assistant is reachable but rejected the token: create a
fresh long-lived access token and run the script again.

Run the full check suite before committing:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
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

- `docs/development.md`: development contract, TDD rules, and verification
- `project-spec/project.md`: goals, stack, and non-goals
- `project-spec/interfaces.md`: tool and auth contracts
- `project-spec/constraints.md`: security, privacy, and networking rules
- `project-spec/decisions/`: architecture decisions
- `CONTEXT.md`: domain vocabulary

## Collaboration

Bug reports and feature ideas go to
[GitHub Issues](https://github.com/jhchein/homeassistant-garmin-mcp/issues). New
issues from agents get the `needs-triage` label; see
[docs/agents/triage-labels.md](docs/agents/triage-labels.md) for the label set.

Before opening a pull request, run the full check suite and keep changes inside
the v1 boundaries above (read-only, on-demand, no analytics):

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

The development contract in
[docs/development.md](docs/development.md) covers the TDD rules and verification
steps in more detail.

## License

[MIT](LICENSE) © 2026 Hendrik Hein
