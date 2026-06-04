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
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  }).catch(() => {
    throw new HomeAssistantError("Home Assistant request failed.");
  });

  if (!response.ok) {
    throw new HomeAssistantError(`Home Assistant returned HTTP ${response.status}.`, response.status);
  }

  const payload = await readJsonResponse(response);
  if (!Array.isArray(payload)) {
    throw new HomeAssistantError("Home Assistant /api/states response was not an array.");
  }

  return payload.flatMap((entry) => {
    const state = toHomeAssistantState(entry);
    return state ? [state] : [];
  });
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new HomeAssistantError("Home Assistant /api/states response was not valid JSON.");
  }
}

function toHomeAssistantState(entry: unknown): HomeAssistantState | null {
  if (!isRecord(entry)) {
    return null;
  }

  const entityId = entry["entity_id"];
  const state = entry["state"];
  const lastChanged = entry["last_changed"];
  const lastUpdated = entry["last_updated"];

  if (typeof entityId !== "string" || !entityId.trim()) {
    return null;
  }

  if (typeof state !== "string" || typeof lastChanged !== "string" || typeof lastUpdated !== "string") {
    return null;
  }

  return {
    entity_id: entityId,
    state,
    attributes: isRecord(entry["attributes"]) ? entry["attributes"] : {},
    last_changed: lastChanged,
    last_updated: lastUpdated,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
