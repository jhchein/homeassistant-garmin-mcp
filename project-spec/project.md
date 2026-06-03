# Project

## Overview

- **Name**: homeassistant-garmin-mcp
- **One-liner**: Minimal MCP server exposing Garmin-derived Home Assistant stats through a parameterless current-stats tool.

## Goals

- Expose Garmin-derived Home Assistant entity state to MCP-compatible local agents.
- Keep v1 minimal: one tool, `get_current_stats`, with no parameters.
- Return factual normalized data with stable `status`, `captured_at`, `source`, `missing`, `stale`, and `stats` fields.
- Keep the implementation public-ready from day one.
- Make the TypeScript/Node developer experience explicit and copy-pasteable for maintainers who are new to the stack.

## Stack

- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Transport**: stdio
- **Home Assistant access**: REST API using `HA_URL` and `HA_TOKEN`
- **Testing**: Vitest
- **Package manager**: npm
- **License**: MIT

## Non-goals

- No direct Garmin Connect client.
- No coaching decisions, analytics, interpretations, or recommendations.
- No write operations.
- No cache, database, or scheduler in v1.
- No historical/range query parameters in v1.
- No private environment assumptions in committed docs or examples.
