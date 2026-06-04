import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchHomeAssistantStates, HomeAssistantError } from "../src/homeAssistantClient.js";
import type { AppConfig } from "../src/config.js";

const config: AppConfig = {
  haUrl: "https://ha.example.com",
  haToken: "secret-token",
  requestTimeoutMs: 1000,
  staleAfterHours: 24
};

describe("fetchHomeAssistantStates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns valid Home Assistant states and discards malformed entries", async () => {
    stubStatesResponse([
      state("sensor.sleep_score", "76"),
      "not-an-object",
      state(" ", "42"),
      { ...state("sensor.body_battery_most_recent", "80"), state: 80 },
      {
        entity_id: "sensor.resting_heart_rate",
        state: "55",
        attributes: {},
        last_changed: "2026-06-03T11:55:00.000Z"
      },
      {
        entity_id: "sensor.avg_stress_level",
        state: "20",
        attributes: "not-an-object",
        last_changed: "2026-06-03T11:55:00.000Z",
        last_updated: "2026-06-03T11:55:00.000Z"
      }
    ]);

    const result = await fetchHomeAssistantStates(config);

    expect(result).toEqual([
      state("sensor.sleep_score", "76"),
      {
        entity_id: "sensor.avg_stress_level",
        state: "20",
        attributes: {},
        last_changed: "2026-06-03T11:55:00.000Z",
        last_updated: "2026-06-03T11:55:00.000Z"
      }
    ]);
  });

  it("rejects non-array Home Assistant state payloads without exposing payload details", async () => {
    stubStatesResponse({ error: "secret-token from https://ha.example.com" });

    try {
      await fetchHomeAssistantStates(config);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HomeAssistantError);
      expect(error).toHaveProperty("message", "Home Assistant /api/states response was not an array.");
      expect(error).not.toHaveProperty("message", expect.stringContaining("secret-token"));
      expect(error).not.toHaveProperty("message", expect.stringContaining("ha.example.com"));
    }
  });

  it("rejects invalid JSON responses without exposing response details", async () => {
    stubResponse(new Response("not-json secret-token https://ha.example.com", { status: 200 }));

    try {
      await fetchHomeAssistantStates(config);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HomeAssistantError);
      expect(error).toHaveProperty("message", "Home Assistant /api/states response was not valid JSON.");
      expect(error).not.toHaveProperty("message", expect.stringContaining("secret-token"));
      expect(error).not.toHaveProperty("message", expect.stringContaining("ha.example.com"));
    }
  });

  it("rejects request failures without exposing low-level error details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("secret-token https://ha.example.com connection failed");
      })
    );

    try {
      await fetchHomeAssistantStates(config);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HomeAssistantError);
      expect(error).toHaveProperty("message", "Home Assistant request failed.");
      expect(error).not.toHaveProperty("message", expect.stringContaining("secret-token"));
      expect(error).not.toHaveProperty("message", expect.stringContaining("ha.example.com"));
    }
  });
});

function stubStatesResponse(payload: unknown): void {
  stubResponse(new Response(JSON.stringify(payload), { status: 200 }));
}

function stubResponse(response: Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response)
  );
}

function state(entityId: string, value: string) {
  return {
    entity_id: entityId,
    state: value,
    attributes: { unit_of_measurement: "units" },
    last_changed: "2026-06-03T11:55:00.000Z",
    last_updated: "2026-06-03T11:55:00.000Z"
  };
}