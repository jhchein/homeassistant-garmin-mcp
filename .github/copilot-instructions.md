# homeassistant-garmin-mcp

Minimal MCP server exposing Garmin-derived Home Assistant stats through a
parameterless current-stats tool.

## Stack

- Language: TypeScript
- Runtime: Node.js 20+
- MCP SDK: `@modelcontextprotocol/sdk`
- Transport: stdio
- Tests: Vitest
- Package manager: npm

## Agent context

Full project context lives in `project-spec/`:

- `project-spec/project.md` — goals, stack, non-goals
- `project-spec/constraints.md` — security, privacy, networking
- `project-spec/interfaces.md` — API/auth contracts
- `project-spec/decisions/` — architecture decision records
- `project-spec/todos.md` — planning narrative

Domain vocabulary: `CONTEXT.md` at the repo root.

Issue tracker: GitHub Issues. Use `gh issue list/create/view`.

## Guardrails

- Do not add direct Garmin Connect authentication in v1.
- Do not add writes, cache, database, or scheduler behavior in v1.
- Do not include analytics, interpretations, caveats, or recommendations in MCP
  responses.
- Do not commit real Home Assistant URLs, tokens, or private examples.
- Keep TypeScript/Node commands explicit and beginner-friendly.
