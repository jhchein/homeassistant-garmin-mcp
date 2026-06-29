import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchHomeAssistantConfig,
  fetchHomeAssistantHistory,
  fetchHomeAssistantStates,
  HomeAssistantError,
} from "../src/homeAssistantClient.js";
import type { AppConfig } from "../src/config.js";

const config: AppConfig = {
  haUrl: "https://ha.example.com",
  haToken: "secret-token",
  requestTimeoutMs: 1000,
  staleAfterHours: 24,
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
        last_changed: "2026-06-03T11:55:00.000Z",
      },
      {
        entity_id: "sensor.avg_stress_level",
        state: "20",
        attributes: "not-an-object",
        last_changed: "2026-06-03T11:55:00.000Z",
        last_updated: "2026-06-03T11:55:00.000Z",
      },
    ]);

    const result = await fetchHomeAssistantStates(config);

    expect(result).toEqual([
      state("sensor.sleep_score", "76"),
      {
        entity_id: "sensor.avg_stress_level",
        state: "20",
        attributes: {},
        last_changed: "2026-06-03T11:55:00.000Z",
        last_updated: "2026-06-03T11:55:00.000Z",
      },
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
      }),
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

describe("fetchHomeAssistantConfig", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid JSON responses without exposing response details", async () => {
    stubResponse(new Response("not-json secret-token https://ha.example.com", { status: 200 }));

    try {
      await fetchHomeAssistantConfig(config);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HomeAssistantError);
      expect(error).toHaveProperty("message", "Home Assistant /api/config response was not valid JSON.");
      expect(error).not.toHaveProperty("message", expect.stringContaining("secret-token"));
      expect(error).not.toHaveProperty("message", expect.stringContaining("ha.example.com"));
    }
  });

  it("falls back to UTC when config payloads lack a usable time_zone", async () => {
    stubStatesResponse(["unexpected"]);

    const result = await fetchHomeAssistantConfig(config);

    expect(result).toEqual({ time_zone: "UTC" });
  });
});

describe("fetchHomeAssistantHistory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid JSON responses without exposing response details", async () => {
    stubResponse(new Response("not-json secret-token https://ha.example.com", { status: 200 }));

    try {
      await fetchHomeAssistantHistory(config, {
        start: new Date("2026-06-28T00:00:00.000Z"),
        end: new Date("2026-06-29T00:00:00.000Z"),
        entityIds: ["sensor.sleep_score"],
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HomeAssistantError);
      expect(error).toHaveProperty("message", "Home Assistant /api/history/period response was not valid JSON.");
      expect(error).not.toHaveProperty("message", expect.stringContaining("secret-token"));
      expect(error).not.toHaveProperty("message", expect.stringContaining("ha.example.com"));
    }
  });

  it("rejects non-array history payloads", async () => {
    stubResponse(new Response(JSON.stringify({ error: "unexpected" }), { status: 200 }));

    try {
      await fetchHomeAssistantHistory(config, {
        start: new Date("2026-06-28T00:00:00.000Z"),
        end: new Date("2026-06-29T00:00:00.000Z"),
        entityIds: ["sensor.sleep_score"],
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HomeAssistantError);
      expect(error).toHaveProperty("message", "Home Assistant /api/history/period response was not an array.");
    }
  });

  it("discards malformed entries and preserves nested arrays", async () => {
    stubResponse(
      new Response(
        JSON.stringify([
          [state("sensor.sleep_score", "82"), "bad-entry"],
          [
            {
              entity_id: "",
              state: "90",
              attributes: {},
              last_changed: "2026-06-29T05:00:00.000Z",
              last_updated: "2026-06-29T05:00:00.000Z",
            },
            state("sensor.garmin_connect_training_readiness", "84"),
          ],
        ]),
        { status: 200 },
      ),
    );

    const result = await fetchHomeAssistantHistory(config, {
      start: new Date("2026-06-28T00:00:00.000Z"),
      end: new Date("2026-06-29T00:00:00.000Z"),
      entityIds: ["sensor.sleep_score", "sensor.garmin_connect_training_readiness"],
    });

    expect(result).toEqual([
      [state("sensor.sleep_score", "82")],
      [state("sensor.garmin_connect_training_readiness", "84")],
    ]);
  });
});

function stubStatesResponse(payload: unknown): void {
  stubResponse(new Response(JSON.stringify(payload), { status: 200 }));
}

function stubResponse(response: Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response),
  );
}

function state(entityId: string, value: string) {
  return {
    entity_id: entityId,
    state: value,
    attributes: { unit_of_measurement: "units" },
    last_changed: "2026-06-03T11:55:00.000Z",
    last_updated: "2026-06-03T11:55:00.000Z",
  };
}
