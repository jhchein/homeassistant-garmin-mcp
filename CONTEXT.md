# Home Assistant Garmin MCP Context

This file captures the domain language for a small MCP server that exposes
Garmin-derived Home Assistant stats to local agents.

## Language

**Home Assistant**:
The upstream system that owns integrations, authentication, entity state, and timestamps.
_Avoid_: Garmin client, health backend

**Garmin Connect Integration**:
The Home Assistant integration that exposes Garmin-derived entities as Home
Assistant state.
_Avoid_: direct Garmin API, python-garminconnect

**Current Stats**:
The current best available Garmin-derived facts returned by the MCP tool,
including overnight and day-so-far data when Home Assistant exposes it.
_Avoid_: snapshot, wellbeing score, health report

**Stats Envelope**:
The stable top-level MCP response shape containing `status`, `captured_at`,
`source`, `missing`, `stale`, and `stats`.
_Avoid_: recommendation payload, analytics result

**Missing Field**:
A stat path that could not be returned because the Home Assistant entity was
absent, unavailable, unknown, or unusable.
_Avoid_: failed stat

**Expansion Field**:
An opportunistic stat path that is useful when present but not required for a
complete current-stats envelope.
_Avoid_: mandatory Garmin metric

**Stale Field**:
A stat path whose Home Assistant timestamp is too old for current-state use.
_Avoid_: bad data, wrong value

**Consumer Agent**:
The MCP client or agent that interprets current stats and combines them with
human context.
_Avoid_: MCP server logic, coach inside the server

## Relationships

- **Home Assistant** exposes entities through the **Garmin Connect Integration**.
- `homeassistant-garmin-mcp` reads **Home Assistant** and returns **Current Stats**.
- **Current Stats** are wrapped in the **Stats Envelope**.
- The **Consumer Agent** interprets **Current Stats**; the MCP server does not.
- A required **Missing Field** or **Stale Field** may affect the **Stats Envelope**
  status.
- An absent **Expansion Field** is omitted rather than treated as a partial
  response.

## Example Dialogue

> **Developer:** "Should `get_current_stats` decide whether training readiness
> is good?"
> **Domain expert:** "No. It should return the factual Garmin stats and
> timestamps. The consumer agent decides what they mean."

## Flagged Ambiguities

- "Snapshot" sounded neat but was too generic for a public MCP server. Resolved:
  use **Current Stats** and the tool name `get_current_stats`.
- "Wellbeing" is meaningful to some consumer agents but too loaded for the
  public repo/tool surface. Resolved: public name is
  `homeassistant-garmin-mcp`.
