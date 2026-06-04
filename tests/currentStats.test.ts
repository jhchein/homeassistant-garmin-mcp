import { afterEach, describe, expect, it, vi } from "vitest";

import { readCurrentStats } from "../src/currentStats.js";
import { ENTITY_DEFINITIONS, LAST_SYNC_ENTITY_ID } from "../src/entityMap.js";
import { ConfigError } from "../src/config.js";
import { HomeAssistantError } from "../src/homeAssistantClient.js";

const capturedAt = new Date("2026-06-03T12:00:00.000Z");
const currentUpdatedAt = "2026-06-03T11:55:00.000Z";

describe("readCurrentStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a full stats envelope from Home Assistant states", async () => {
    const fetchMock = stubStatesResponse([
      ...ENTITY_DEFINITIONS.map((definition, index) => state(definition.entityId, String(index + 1))),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z"),
    ]);

    const result = await readCurrentStats({
      capturedAt,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(result.envelope.status).toBe("full");
    expect(result.envelope.captured_at).toBe("2026-06-03T12:00:00.000Z");
    expect(result.envelope.missing).toEqual([]);
    expect(result.envelope.stale).toEqual([]);
    expect(result.envelope.stats.sleep["score"]?.value).toBe(6);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ha.example.com/api/states",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          Authorization: "Bearer secret-token",
        },
      }),
    );
  });

  it("returns an unavailable stats envelope while retaining configuration errors for diagnostics", async () => {
    const result = await readCurrentStats({ env: {}, envFilePath: null, capturedAt });

    expect(result.ok).toBe(false);
    expect(result.envelope).toMatchObject({
      captured_at: "2026-06-03T12:00:00.000Z",
      missing: ["home_assistant"],
      status: "unavailable",
    });
    expect(result.error).toBeInstanceOf(ConfigError);
  });

  it("returns an unavailable stats envelope while retaining Home Assistant errors for diagnostics", async () => {
    stubResponse(new Response("unauthorized", { status: 401 }));

    const result = await readCurrentStats({
      capturedAt,
      env: { HA_TOKEN: "secret-token", HA_URL: "https://ha.example.com" },
      envFilePath: null,
    });

    expect(result.ok).toBe(false);
    expect(result.envelope).toMatchObject({
      captured_at: "2026-06-03T12:00:00.000Z",
      missing: ["home_assistant"],
      status: "unavailable",
    });
    expect(result.error).toBeInstanceOf(HomeAssistantError);
    expect(result.error).toHaveProperty("statusCode", 401);
  });
});

function stubStatesResponse(payload: unknown) {
  return stubResponse(new Response(JSON.stringify(payload), { status: 200 }));
}

function stubResponse(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function state(entityId: string, value: string) {
  return {
    entity_id: entityId,
    state: value,
    attributes: { unit_of_measurement: "units" },
    last_changed: currentUpdatedAt,
    last_updated: currentUpdatedAt,
  };
}
