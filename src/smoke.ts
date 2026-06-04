import { ConfigError, loadConfig } from "./config.js";
import { fetchHomeAssistantStates, HomeAssistantError } from "./homeAssistantClient.js";
import { normalizeCurrentStats } from "./normalize.js";

export interface SmokeCheckOptions {
  capturedAt?: Date;
  env?: NodeJS.ProcessEnv;
  envFilePath?: string | null;
}

export interface SmokeCheckResult {
  exitCode: 0 | 1;
  stdout: string;
  stderr: string;
}

export async function runSmokeCheck(options: SmokeCheckOptions = {}): Promise<SmokeCheckResult> {
  try {
    const config = loadConfig(options.env, options.envFilePath);
    const states = await fetchHomeAssistantStates(config);
    const envelope = normalizeCurrentStats(states, {
      ...(options.capturedAt ? { capturedAt: options.capturedAt } : {}),
      staleAfterHours: config.staleAfterHours,
    });

    return {
      exitCode: 0,
      stdout: JSON.stringify(envelope, null, 2),
      stderr: "",
    };
  } catch (error: unknown) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: smokeErrorMessage(error),
    };
  }
}

export function smokeErrorMessage(error: unknown): string {
  if (error instanceof ConfigError) {
    return `Smoke test configuration error: ${error.message}`;
  }

  if (error instanceof HomeAssistantError && isAuthFailure(error.statusCode)) {
    return [
      `Smoke test authentication failed: Home Assistant rejected HA_TOKEN (HTTP ${error.statusCode}).`,
      "Create a fresh Home Assistant long-lived access token, set HA_TOKEN again, and rerun npm run smoke.",
    ].join("\n");
  }

  if (error instanceof HomeAssistantError) {
    return `Smoke test Home Assistant error: ${error.message}`;
  }

  return `Smoke test failed: ${errorMessage(error)}`;
}

function isAuthFailure(statusCode: number | undefined): boolean {
  return statusCode === 401 || statusCode === 403;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
