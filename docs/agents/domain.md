# Domain Docs Layout

## Vocabulary

- Primary: `CONTEXT.md` at the repo root
- Keep public terminology neutral: Garmin stats, Home Assistant, MCP server
- Avoid private workflow labels in public docs unless they are clearly examples

## Architecture Decision Records

- Location: `project-spec/decisions/YYYY-MM-DD/slug.md`
- Index: `project-spec/decisions/README.md`
- Three-gate rule — only create an ADR when all three are true:
  1. Hard to reverse
  2. Surprising without context
  3. The result of a real trade-off with genuine alternatives
- Reference format: "the 2026-06-03 v1 MCP contract ADR"

## Before exploring any area

1. Read `CONTEXT.md`.
2. Scan `project-spec/decisions/` for ADRs touching the area.
3. If a proposal contradicts an existing ADR, surface it explicitly rather than silently overriding it.
