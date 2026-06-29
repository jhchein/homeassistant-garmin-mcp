export type StatsStatus = "full" | "partial" | "stale" | "unavailable";

export interface SourceInfo {
  system: "home_assistant";
  integration: "garmin_connect";
  last_synced: string | null;
}

export interface RecentStatsSourceInfo {
  system: "home_assistant";
  integration: "garmin_connect";
  history_source: "home_assistant_recorder";
  time_zone: string;
  range_start: string;
  range_end: string;
}

export interface StatValue {
  value: string | number | boolean;
  unit: string | null;
  entity_id: string;
  last_changed: string | null;
  last_updated: string | null;
}

export interface AliasedStatValue extends StatValue {
  source_field: string;
}

export type StatsSection = Record<string, StatValue | AliasedStatValue>;

export interface CurrentStats {
  sleep: StatsSection;
  recovery: StatsSection;
  hrv: StatsSection;
  cardio: StatsSection;
  stress: StatsSection;
  body_battery: StatsSection;
  activity: StatsSection;
  fitness: StatsSection;
  body_composition: StatsSection;
  time_series: Record<string, unknown>;
}

export type StatsSectionName = keyof CurrentStats;

export interface CurrentStatsEnvelope {
  status: StatsStatus;
  captured_at: string;
  source: SourceInfo;
  missing: string[];
  stale: string[];
  stats: CurrentStats;
}

export interface RecentStatsDay extends Omit<CurrentStats, "time_series"> {
  date: string;
}

export interface RecentStatsEnvelope {
  status: StatsStatus;
  captured_at: string;
  source: RecentStatsSourceInfo;
  missing: string[];
  stale: string[];
  stats_by_day: RecentStatsDay[];
}

export interface HomeAssistantConfig {
  time_zone: string;
}

export interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}
