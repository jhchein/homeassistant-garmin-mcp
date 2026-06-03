import { ENTITY_DEFINITIONS, LAST_SYNC_ENTITY_ID } from "./entityMap.js";
import type { CurrentStats, CurrentStatsEnvelope, HomeAssistantState, StatValue } from "./types.js";

const UNKNOWN_STATES = new Set(["", "unknown", "unavailable", "none", "null"]);

export function normalizeCurrentStats(
  states: HomeAssistantState[],
  options: { capturedAt?: Date; staleAfterHours?: number } = {}
): CurrentStatsEnvelope {
  const capturedAt = options.capturedAt ?? new Date();
  const staleAfterHours = options.staleAfterHours ?? 24;
  const stateByEntityId = new Map(states.map((state) => [state.entity_id, state]));
  const stats = createEmptyStats();
  const missing: string[] = [];
  const stale: string[] = [];

  for (const definition of ENTITY_DEFINITIONS) {
    const path = `stats.${definition.section}.${definition.field}`;
    const state = stateByEntityId.get(definition.entityId);
    const isRequired = definition.required !== false;

    if (!state || isUnknownState(state.state)) {
      if (isRequired) {
        missing.push(path);
      }
      continue;
    }

    stats[definition.section][definition.field] = toStatValue(state);

    if (isRequired && isStale(state, capturedAt, staleAfterHours)) {
      stale.push(path);
    }
  }

  const lastSyncedState = stateByEntityId.get(LAST_SYNC_ENTITY_ID);
  let lastSynced: string | null = null;
  if (!lastSyncedState || isUnknownState(lastSyncedState.state)) {
    missing.push("source.last_synced");
  } else {
    lastSynced = coerceStateValue(lastSyncedState.state).toString();
    if (isStale(lastSyncedState, capturedAt, staleAfterHours)) {
      stale.push("source.last_synced");
    }
  }

  return {
    status: statusFor(missing, stale),
    captured_at: capturedAt.toISOString(),
    source: {
      system: "home_assistant",
      integration: "garmin_connect",
      last_synced: lastSynced
    },
    missing,
    stale,
    stats
  };
}

export function unavailableStats(capturedAt: Date = new Date()): CurrentStatsEnvelope {
  return {
    status: "unavailable",
    captured_at: capturedAt.toISOString(),
    source: {
      system: "home_assistant",
      integration: "garmin_connect",
      last_synced: null
    },
    missing: ["home_assistant"],
    stale: [],
    stats: createEmptyStats()
  };
}

export function createEmptyStats(): CurrentStats {
  return {
    sleep: {},
    recovery: {},
    hrv: {},
    cardio: {},
    stress: {},
    body_battery: {},
    activity: {},
    fitness: {},
    body_composition: {},
    time_series: {}
  };
}

function toStatValue(state: HomeAssistantState): StatValue {
  return {
    value: coerceStateValue(state.state),
    unit: unitOfMeasurement(state),
    entity_id: state.entity_id,
    last_changed: state.last_changed || null,
    last_updated: state.last_updated || null
  };
}

function coerceStateValue(rawValue: string): string | number | boolean {
  const trimmed = rawValue.trim();

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  const numericValue = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(numericValue)) {
    return numericValue;
  }

  return trimmed;
}

function unitOfMeasurement(state: HomeAssistantState): string | null {
  const unit = state.attributes["unit_of_measurement"];
  return typeof unit === "string" && unit.trim() ? unit : null;
}

function isUnknownState(rawValue: string): boolean {
  return UNKNOWN_STATES.has(rawValue.trim().toLowerCase());
}

function isStale(state: HomeAssistantState, capturedAt: Date, staleAfterHours: number): boolean {
  const timestamp = Date.parse(state.last_updated || state.last_changed);
  if (!Number.isFinite(timestamp)) {
    return true;
  }

  const ageMs = capturedAt.getTime() - timestamp;
  return ageMs > staleAfterHours * 60 * 60 * 1000;
}

function statusFor(missing: string[], stale: string[]): CurrentStatsEnvelope["status"] {
  if (missing.length === 0 && stale.length === 0) {
    return "full";
  }

  if (missing.length === 0 && stale.length > 0) {
    return "stale";
  }

  return "partial";
}
