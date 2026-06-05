# Infrastructure

## Runtime

- Local stdio MCP server.
- Intended to run through local MCP clients such as VS Code or Claude Desktop.
- No hosted infrastructure required for v1.

## Configuration

Configuration is supplied through environment variables:

- `HA_URL`
- `HA_TOKEN`
- `HA_REQUEST_TIMEOUT_MS`
- `HA_STALE_AFTER_HOURS`

Commit `.env.example`; never commit `.env`.

## Packaging

- Build output goes to `dist/`.
- Package exposes a binary named `homeassistant-garmin-mcp`.
- Published to npm as `@jhchein/homeassistant-garmin-mcp` and runnable with
  `npx -y @jhchein/homeassistant-garmin-mcp`.

## CI

Recommended checks:

- `npm run typecheck`
- `npm test`
- `npm run build`
