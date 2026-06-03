import type { AppConfig } from "./config.js";
import type { HomeAssistantState } from "./types.js";

export class HomeAssistantError extends Error {
  readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "HomeAssistantError";
    this.statusCode = statusCode;
  }
}

export async function fetchHomeAssistantStates(config: AppConfig): Promise<HomeAssistantState[]> {
  const response = await fetch(`${config.haUrl}/api/states`, {
    headers: {
      Authorization: `Bearer ${config.haToken}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(config.requestTimeoutMs)
  }).catch((error: unknown) => {
    throw new HomeAssistantError(`Home Assistant request failed: ${errorMessage(error)}`);
  });

  if (!response.ok) {
    throw new HomeAssistantError(`Home Assistant returned HTTP ${response.status}.`, response.status);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new HomeAssistantError("Home Assistant /api/states response was not an array.");
  }

  return payload as HomeAssistantState[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
