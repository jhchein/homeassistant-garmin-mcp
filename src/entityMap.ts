import type { StatsSectionName } from "./types.js";

export interface EntityDefinition {
  section: Exclude<StatsSectionName, "time_series">;
  field: string;
  entityId: string;
  required?: boolean;
}

export const LAST_SYNC_ENTITY_ID = "sensor.garmin_connect_last_synced";

export const ENTITY_DEFINITIONS: readonly EntityDefinition[] = [
  { section: "body_battery", field: "current", entityId: "sensor.body_battery_most_recent" },
  { section: "body_battery", field: "highest", entityId: "sensor.body_battery_highest" },
  { section: "body_battery", field: "lowest", entityId: "sensor.body_battery_lowest" },
  { section: "body_battery", field: "charged", entityId: "sensor.body_battery_charged" },
  { section: "body_battery", field: "drained", entityId: "sensor.body_battery_drained" },
  { section: "sleep", field: "score", entityId: "sensor.sleep_score" },
  { section: "sleep", field: "duration", entityId: "sensor.sleep_duration" },
  { section: "sleep", field: "total_duration", entityId: "sensor.total_sleep_duration" },
  { section: "sleep", field: "need", entityId: "sensor.garmin_connect_sleep_need" },
  { section: "sleep", field: "deep_sleep", entityId: "sensor.garmin_connect_deep_sleep" },
  { section: "sleep", field: "rem_sleep", entityId: "sensor.garmin_connect_rem_sleep" },
  { section: "sleep", field: "light_sleep", entityId: "sensor.garmin_connect_light_sleep" },
  { section: "recovery", field: "training_readiness", entityId: "sensor.garmin_connect_training_readiness" },
  {
    section: "recovery",
    field: "morning_training_readiness",
    entityId: "sensor.garmin_connect_morning_training_readiness",
  },
  { section: "recovery", field: "training_status", entityId: "sensor.garmin_connect_training_status" },
  { section: "recovery", field: "recovery_time", entityId: "sensor.garmin_connect_recovery_time" },
  { section: "hrv", field: "status", entityId: "sensor.hrv_status" },
  { section: "hrv", field: "last_night_average", entityId: "sensor.garmin_connect_hrv_last_night_average" },
  { section: "hrv", field: "weekly_average", entityId: "sensor.garmin_connect_hrv_weekly_average" },
  { section: "hrv", field: "baseline", entityId: "sensor.garmin_connect_hrv_baseline" },
  { section: "cardio", field: "resting_heart_rate", entityId: "sensor.resting_heart_rate" },
  { section: "stress", field: "average_level", entityId: "sensor.avg_stress_level" },
  { section: "stress", field: "max_level", entityId: "sensor.max_stress_level" },
  { section: "stress", field: "rest_duration", entityId: "sensor.rest_stress_duration" },
  { section: "stress", field: "activity_duration", entityId: "sensor.activity_stress_duration" },
  { section: "stress", field: "low_duration", entityId: "sensor.low_stress_duration" },
  { section: "stress", field: "medium_duration", entityId: "sensor.medium_stress_duration" },
  { section: "stress", field: "high_duration", entityId: "sensor.high_stress_duration" },
  { section: "body_composition", field: "weight", entityId: "sensor.garmin_connect_weight", required: false },
  { section: "fitness", field: "fitness_age", entityId: "sensor.garmin_connect_fitness_age", required: false },
  {
    section: "fitness",
    field: "achievable_fitness_age",
    entityId: "sensor.garmin_connect_achievable_fitness_age",
    required: false,
  },
  { section: "fitness", field: "endurance_score", entityId: "sensor.garmin_connect_endurance_score", required: false },
  { section: "fitness", field: "hill_score", entityId: "sensor.garmin_connect_hill_score", required: false },
  { section: "fitness", field: "vo2_max", entityId: "sensor.garmin_connect_vo2_max", required: false },
  { section: "fitness", field: "ftp_cycling", entityId: "sensor.garmin_connect_ftp_cycling", required: false },
  {
    section: "fitness",
    field: "power_to_weight_cycling",
    entityId: "sensor.garmin_connect_power_to_weight_cycling",
    required: false,
  },
  {
    section: "fitness",
    field: "lactate_threshold_heart_rate",
    entityId: "sensor.garmin_connect_lactate_threshold_heart_rate",
    required: false,
  },
  {
    section: "activity",
    field: "weekly_distance_average",
    entityId: "sensor.garmin_connect_weekly_distance_average",
    required: false,
  },
  {
    section: "activity",
    field: "weekly_step_average",
    entityId: "sensor.garmin_connect_weekly_step_average",
    required: false,
  },
  {
    section: "activity",
    field: "yesterday_distance",
    entityId: "sensor.garmin_connect_yesterday_distance",
    required: false,
  },
  { section: "activity", field: "yesterday_steps", entityId: "sensor.garmin_connect_yesterday_steps", required: false },
  {
    section: "activity",
    field: "intensity_minutes",
    entityId: "sensor.garmin_connect_intensity_minutes",
    required: false,
  },
  {
    section: "activity",
    field: "last_activity_route",
    entityId: "sensor.garmin_connect_last_activity_route",
    required: false,
  },
];
