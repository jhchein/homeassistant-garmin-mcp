import { ConfigError, loadConfig } from "../src/config.js";
import { fetchHomeAssistantStates, HomeAssistantError } from "../src/homeAssistantClient.js";
import { normalizeCurrentStats } from "../src/normalize.js";

try {
  const config = loadConfig();
  const states = await fetchHomeAssistantStates(config);
  const envelope = normalizeCurrentStats(states, { staleAfterHours: config.staleAfterHours });

  console.log(JSON.stringify(envelope, null, 2));
} catch (error: unknown) {
  process.exitCode = 1;

  if (error instanceof ConfigError) {
    console.error(`Smoke test configuration error: ${error.message}`);
  } else if (error instanceof HomeAssistantError && isAuthFailure(error.statusCode)) {
    console.error(`Smoke test authentication failed: Home Assistant rejected HA_TOKEN (HTTP ${error.statusCode}).`);
    console.error("Create a fresh Home Assistant long-lived access token, set HA_TOKEN again, and rerun npm run smoke.");
  } else if (error instanceof HomeAssistantError) {
    console.error(`Smoke test Home Assistant error: ${error.message}`);
  } else {
    console.error(`Smoke test failed: ${errorMessage(error)}`);
  }
}

function isAuthFailure(statusCode: number | undefined): boolean {
  return statusCode === 401 || statusCode === 403;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}