import { ConfigError, loadConfig } from "./config.js";
import { ENTITY_DEFINITIONS } from "./entityMap.js";
import { fetchHomeAssistantConfig, fetchHomeAssistantHistory, HomeAssistantError } from "./homeAssistantClient.js";
import { normalizeRecentStats } from "./recentNormalize.js";
import type { RecentStatsEnvelope } from "./types.js";

const DEFAULT_DAYS = 7;

export interface RecentStatsOptions {
  capturedAt?: Date;
  days?: number;
  env?: NodeJS.ProcessEnv;
  envFilePath?: string | null;
}

export type RecentStatsError = ConfigError | HomeAssistantError;

export type RecentStatsResult =
  | {
      ok: true;
      envelope: RecentStatsEnvelope;
    }
  | {
      ok: false;
      envelope: RecentStatsEnvelope;
      error: RecentStatsError;
    };

export async function readRecentStats(options: RecentStatsOptions = {}): Promise<RecentStatsResult> {
  const capturedAt = options.capturedAt ?? new Date();

  try {
    const config = loadConfig(options.env, options.envFilePath);
    const homeAssistantConfig = await fetchHomeAssistantConfig(config);
    const days = validDays(options.days);
    const range = recentCalendarRange(capturedAt, days, homeAssistantConfig.time_zone);
    const entityIds = ENTITY_DEFINITIONS.map((definition) => definition.entityId);
    const history = await fetchHomeAssistantHistory(config, { start: range.start, end: capturedAt, entityIds });
    const envelope = normalizeRecentStats(history, {
      capturedAt,
      dates: range.dates,
      rangeStart: range.start,
      staleAfterHours: config.staleAfterHours,
      timeZone: homeAssistantConfig.time_zone,
    });

    return { ok: true, envelope };
  } catch (error: unknown) {
    if (error instanceof ConfigError || error instanceof HomeAssistantError) {
      return {
        ok: false,
        envelope: unavailableRecentStats(capturedAt),
        error,
      };
    }

    throw error;
  }
}

function validDays(days: number | undefined): number {
  if (typeof days !== "number") {
    return DEFAULT_DAYS;
  }

  return Number.isInteger(days) && days >= 1 && days <= 28 ? days : DEFAULT_DAYS;
}

function recentCalendarRange(capturedAt: Date, days: number, timeZone: string): { start: Date; dates: string[] } {
  const endDate = localDate(capturedAt, timeZone);
  const dates = Array.from({ length: days }, (_, index) => addDays(endDate, index - days + 1));
  const start = zonedMidnightUtc(dates[0] ?? endDate, timeZone);
  return { start, dates };
}

function unavailableRecentStats(capturedAt: Date): RecentStatsEnvelope {
  return {
    status: "unavailable",
    captured_at: capturedAt.toISOString(),
    source: {
      system: "home_assistant",
      integration: "garmin_connect",
      history_source: "home_assistant_recorder",
      time_zone: "unknown",
      range_start: capturedAt.toISOString(),
      range_end: capturedAt.toISOString(),
    },
    missing: ["home_assistant"],
    stale: [],
    stats_by_day: [],
  };
}

function localDate(date: Date, timeZone: string): string {
  const parts = dateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(date: string, days: number): string {
  const utcDate = new Date(`${date}T00:00:00.000Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function zonedMidnightUtc(date: string, timeZone: string): Date {
  const targetUtc = Date.parse(`${date}T00:00:00.000Z`);
  let candidate = new Date(targetUtc);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = dateParts(candidate, timeZone);
    const candidateUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    const delta = targetUtc - candidateUtc;

    if (delta === 0) {
      return candidate;
    }

    candidate = new Date(candidate.getTime() + delta);
  }

  return candidate;
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
