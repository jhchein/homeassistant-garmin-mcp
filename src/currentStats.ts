import { ConfigError, loadConfig } from "./config.js";
import { fetchHomeAssistantStates, HomeAssistantError } from "./homeAssistantClient.js";
import { normalizeCurrentStats, unavailableStats } from "./normalize.js";
import type { CurrentStatsEnvelope } from "./types.js";

export interface CurrentStatsOptions {
  capturedAt?: Date;
  env?: NodeJS.ProcessEnv;
  envFilePath?: string | null;
}

export type CurrentStatsError = ConfigError | HomeAssistantError;

export type CurrentStatsResult =
  | {
      ok: true;
      envelope: CurrentStatsEnvelope;
    }
  | {
      ok: false;
      envelope: CurrentStatsEnvelope;
      error: CurrentStatsError;
    };

export async function readCurrentStats(options: CurrentStatsOptions = {}): Promise<CurrentStatsResult> {
  try {
    const config = loadConfig(options.env, options.envFilePath);
    const states = await fetchHomeAssistantStates(config);
    const envelope = normalizeCurrentStats(states, {
      ...(options.capturedAt ? { capturedAt: options.capturedAt } : {}),
      staleAfterHours: config.staleAfterHours,
    });

    return { ok: true, envelope };
  } catch (error: unknown) {
    if (error instanceof ConfigError || error instanceof HomeAssistantError) {
      return {
        ok: false,
        envelope: unavailableStats(options.capturedAt),
        error,
      };
    }

    throw error;
  }
}

export async function getCurrentStatsEnvelope(options: CurrentStatsOptions = {}): Promise<CurrentStatsEnvelope> {
  const result = await readCurrentStats(options);
  return result.envelope;
}
