# Constraints

## Security

- Never commit real Home Assistant URLs, tokens, or personal environment details.
- Load secrets only from environment variables or local MCP client configuration.
- Do not log tokens or full authorization headers.
- Use read-only Home Assistant REST endpoints in v1.
- Do not introduce a direct Garmin Connect client or separate Garmin credential
  store in v1.

## Privacy

- Treat Garmin-derived data as personal fitness data.
- Keep the repository public-ready: no private vault references, customer/work
  context, real hostnames, or real sample data in committed examples.
- Tests should use synthetic Home Assistant responses.

## Networking

- The server uses stdio for MCP transport.
- The only network dependency is outbound HTTP(S) to Home Assistant.
- `HA_URL` is configured by the user and may point to a local, VPN,
  reverse-proxied, or container-network Home Assistant endpoint.
- The MCP server itself must not expose an HTTP listener in v1.
