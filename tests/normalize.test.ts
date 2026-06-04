import { describe, expect, it } from "vitest";

import { ENTITY_DEFINITIONS, LAST_SYNC_ENTITY_ID } from "../src/entityMap.js";
import { normalizeCurrentStats } from "../src/normalize.js";
import type { HomeAssistantState } from "../src/types.js";

const capturedAt = new Date("2026-06-03T12:00:00.000Z");
const currentUpdatedAt = "2026-06-03T11:55:00.000Z";
const staleUpdatedAt = "2026-06-01T11:55:00.000Z";

describe("normalizeCurrentStats", () => {
  it("returns full status when all mapped entities are present and current", () => {
    const states = [
      ...ENTITY_DEFINITIONS.map((definition, index) =>
        state(definition.entityId, String(index + 1), currentUpdatedAt, "units"),
      ),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z", currentUpdatedAt),
    ];

    const result = normalizeCurrentStats(states, { capturedAt, staleAfterHours: 24 });

    expect(result.status).toBe("full");
    expect(result.missing).toEqual([]);
    expect(result.stale).toEqual([]);
    expect(result.source.last_synced).toBe("2026-06-03T11:58:00.000Z");
    expect(result.stats.sleep["score"]?.value).toBe(6);
    expect(result.stats.sleep["score"]?.entity_id).toBe("sensor.sleep_score");
  });

  it("returns partial status and missing paths for unavailable entities", () => {
    const states = [
      state("sensor.sleep_score", "unavailable", currentUpdatedAt),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z", currentUpdatedAt),
    ];

    const result = normalizeCurrentStats(states, { capturedAt, staleAfterHours: 24 });

    expect(result.status).toBe("partial");
    expect(result.missing).toContain("stats.sleep.score");
    expect(result.missing).toContain("stats.body_battery.current");
    expect(result.stats.sleep["score"]).toBeUndefined();
  });

  it("does not mark optional expansion entities as missing when absent", () => {
    const states = [
      ...ENTITY_DEFINITIONS.filter((definition) => definition.required !== false).map((definition, index) =>
        state(definition.entityId, String(index + 1), currentUpdatedAt, "units"),
      ),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z", currentUpdatedAt),
    ];

    const result = normalizeCurrentStats(states, { capturedAt, staleAfterHours: 24 });

    expect(result.status).toBe("full");
    expect(result.missing).toEqual([]);
    expect(result.stats.fitness["vo2_max"]).toBeUndefined();
    expect(result.stats.activity["yesterday_steps"]).toBeUndefined();
  });

  it("does not mark optional expansion entities as stale when required entities are current", () => {
    const states = [
      ...ENTITY_DEFINITIONS.filter((definition) => definition.required !== false).map((definition, index) =>
        state(definition.entityId, String(index + 1), currentUpdatedAt, "units"),
      ),
      state("sensor.garmin_connect_vo2_max", "48", staleUpdatedAt, "ml/kg/min"),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z", currentUpdatedAt),
    ];

    const result = normalizeCurrentStats(states, { capturedAt, staleAfterHours: 24 });

    expect(result.status).toBe("full");
    expect(result.stale).toEqual([]);
    expect(result.stats.fitness["vo2_max"]?.value).toBe(48);
  });

  it("returns stale status when present entities are older than the freshness threshold", () => {
    const states = [
      ...ENTITY_DEFINITIONS.map((definition) => state(definition.entityId, "42", staleUpdatedAt)),
      state(LAST_SYNC_ENTITY_ID, "2026-06-01T11:58:00.000Z", staleUpdatedAt),
    ];

    const result = normalizeCurrentStats(states, { capturedAt, staleAfterHours: 24 });

    expect(result.status).toBe("stale");
    expect(result.missing).toEqual([]);
    expect(result.stale).toContain("stats.sleep.score");
    expect(result.stale).toContain("source.last_synced");
  });

  it("marks source last sync as missing and preserves factual boolean values", () => {
    const states = ENTITY_DEFINITIONS.filter((definition) => definition.required !== false).map((definition, index) =>
      state(definition.entityId, index === 0 ? "true" : String(index + 1), currentUpdatedAt),
    );

    const result = normalizeCurrentStats(states, { capturedAt, staleAfterHours: 24 });

    expect(result.status).toBe("partial");
    expect(result.missing).toContain("source.last_synced");
    expect(result.source.last_synced).toBeNull();
    expect(result.stats.body_battery["current"]?.value).toBe(true);
    expect(result.stats.body_battery["current"]?.unit).toBeNull();
  });
});

function state(entityId: string, value: string, updatedAt: string, unit?: string): HomeAssistantState {
  return {
    entity_id: entityId,
    state: value,
    attributes: unit ? { unit_of_measurement: unit } : {},
    last_changed: updatedAt,
    last_updated: updatedAt,
  };
}
