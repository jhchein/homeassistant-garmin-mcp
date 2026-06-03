# Todos

Planning narrative and prioritized milestones. Use GitHub Issues for implementation tracking once the repository is initialized remotely.

## V1

- Scaffold TypeScript MCP server.
- Implement Home Assistant `/api/states` client.
- Implement entity map for Garmin Connect v3 Home Assistant entities.
- Implement `get_current_stats({})`.
- Add unit tests for normalization, missing values, stale values, and response status.
- Add README setup and MCP client configuration examples.
- Validate against a real Home Assistant instance locally without committing private config.

## Later

- Add time-series support if Home Assistant Recorder/History provides useful curves.
- Add a separate history/range tool only if current stats are insufficient.
- Add Withings/body-composition fields if they become available through Home Assistant or Garmin.
