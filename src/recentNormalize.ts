import { ENTITY_DEFINITIONS } from "./entityMap.js";
import type { HomeAssistantState, RecentStatsDay, RecentStatsEnvelope, StatValue } from "./types.js";

const UNKNOWN_STATES = new Set(["", "unknown", "unavailable", "none", "null"]);

export function normalizeRecentStats(
  history: HomeAssistantState[][],
  options: { capturedAt: Date; dates: string[]; rangeStart: Date; staleAfterHours: number; timeZone: string },
): RecentStatsEnvelope {
  const missing: string[] = [];
  const stale: string[] = [];
  const statsByDay = options.dates.map((date) => createEmptyRecentStatsDay(date));
  const dayByDate = new Map(statsByDay.map((day) => [day.date, day]));
  const currentDate = localDate(options.capturedAt, options.timeZone);
  const historyStates = history.flat();

  for (const definition of ENTITY_DEFINITIONS) {
    const states = historyStates.filter((state) => state.entity_id === definition.entityId);
    const statesByDate = groupStatesByDate(states, options.timeZone);

    for (const date of options.dates) {
      const day = dayByDate.get(date);
      if (!day) {
        continue;
      }

      const dayStates = statesByDate.get(date) ?? [];
      const state = latestKnownState(dayStates);
      const path = `stats_by_day.${date}.${definition.section}.${definition.field}`;

      if (!state) {
        if (definition.required !== false) {
          missing.push(path);
        }
        continue;
      }

      day[definition.section][definition.field] = toStatValue(state);

      if (
        definition.required !== false &&
        date === currentDate &&
        isStale(state, options.capturedAt, options.staleAfterHours)
      ) {
        stale.push(path);
      }
    }
  }

  for (const day of statsByDay) {
    const morningTrainingReadiness = day.recovery["morning_training_readiness"];
    if (morningTrainingReadiness) {
      day.recovery["watch_training_readiness"] = {
        ...morningTrainingReadiness,
        source_field: "morning_training_readiness",
      };
    }
  }

  return {
    status: missing.length === 0 && stale.length === 0 ? "full" : missing.length === 0 ? "stale" : "partial",
    captured_at: options.capturedAt.toISOString(),
    source: {
      system: "home_assistant",
      integration: "garmin_connect",
      history_source: "home_assistant_recorder",
      time_zone: options.timeZone,
      range_start: options.rangeStart.toISOString(),
      range_end: options.capturedAt.toISOString(),
    },
    missing,
    stale,
    stats_by_day: statsByDay,
  };
}

function groupStatesByDate(states: HomeAssistantState[], timeZone: string): Map<string, HomeAssistantState[]> {
  const grouped = new Map<string, HomeAssistantState[]>();
  for (const state of states) {
    const timestamp = parsedStateTimestamp(state);
    if (timestamp === null) {
      continue;
    }

    const date = localDate(new Date(timestamp), timeZone);
    grouped.set(date, [...(grouped.get(date) ?? []), state]);
  }
  return grouped;
}

function latestKnownState(states: HomeAssistantState[]): HomeAssistantState | null {
  let selectedState: HomeAssistantState | null = null;
  let selectedTimestamp = Number.NEGATIVE_INFINITY;
  let selectedIndex = -1;

  states.forEach((state, index) => {
    if (isUnknownState(state.state)) {
      return;
    }

    const timestamp = parsedStateTimestamp(state);
    if (timestamp === null) {
      return;
    }

    if (timestamp > selectedTimestamp || (timestamp === selectedTimestamp && index > selectedIndex)) {
      selectedState = state;
      selectedTimestamp = timestamp;
      selectedIndex = index;
    }
  });

  return selectedState;
}

function parsedStateTimestamp(state: HomeAssistantState): number | null {
  const lastUpdated = Date.parse(state.last_updated);
  if (Number.isFinite(lastUpdated)) {
    return lastUpdated;
  }

  const lastChanged = Date.parse(state.last_changed);
  if (Number.isFinite(lastChanged)) {
    return lastChanged;
  }

  return null;
}

function isStale(state: HomeAssistantState, capturedAt: Date, staleAfterHours: number): boolean {
  const timestamp = parsedStateTimestamp(state);
  if (timestamp === null) {
    return false;
  }

  const ageMs = capturedAt.getTime() - timestamp;
  return ageMs > staleAfterHours * 60 * 60 * 1000;
}

function createEmptyRecentStatsDay(date: string): RecentStatsDay {
  return {
    date,
    sleep: {},
    recovery: {},
    hrv: {},
    cardio: {},
    stress: {},
    body_battery: {},
    activity: {},
    fitness: {},
    body_composition: {},
  };
}

function toStatValue(state: HomeAssistantState): StatValue {
  return {
    value: coerceStateValue(state.state),
    unit: unitOfMeasurement(state),
    entity_id: state.entity_id,
    last_changed: state.last_changed || null,
    last_updated: state.last_updated || null,
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

function localDate(date: Date, timeZone: string): string {
  const parts = dateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateParts(
  date: Date,
  timeZone: string,
): { year: string; month: string; day: string; hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    year: part(parts, "year"),
    month: part(parts, "month"),
    day: part(parts, "day"),
    hour: part(parts, "hour"),
    minute: part(parts, "minute"),
  };
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((entry) => entry.type === type)?.value ?? "00";
}
