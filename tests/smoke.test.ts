import { afterEach, describe, expect, it, vi } from "vitest";

import { ENTITY_DEFINITIONS, LAST_SYNC_ENTITY_ID } from "../src/entityMap.js";
import { runSmokeCheck } from "../src/smoke.js";

const capturedAt = new Date("2026-06-03T12:00:00.000Z");
const currentUpdatedAt = "2026-06-03T11:55:00.000Z";

describe("runSmokeCheck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a current-stats envelope on stdout without calling real Home Assistant", async () => {
    stubStatesResponse([
      ...ENTITY_DEFINITIONS.map((definition, index) => state(definition.entityId, String(index + 1))),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z"),
    ]);

    const result = await runSmokeCheck({
      capturedAt,
      env: {
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com",
      },
      envFilePath: null,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");

    const envelope = JSON.parse(result.stdout) as {
      status: string;
      captured_at: string;
      missing: string[];
      stale: string[];
    };
    expect(envelope).toMatchObject({
      captured_at: "2026-06-03T12:00:00.000Z",
      missing: [],
      stale: [],
      status: "full",
    });
  });

  it("returns sanitized configuration diagnostics on stderr", async () => {
    const result = await runSmokeCheck({ env: {}, envFilePath: null });

    expect(result).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "Smoke test configuration error: Missing required configuration HA_URL.",
    });
  });

  it("returns sanitized authentication diagnostics on stderr", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("secret-token https://ha.example.com", { status: 401 })),
    );

    const result = await runSmokeCheck({
      env: {
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com",
      },
      envFilePath: null,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      [
        "Smoke test authentication failed: Home Assistant rejected HA_TOKEN (HTTP 401).",
        "Create a fresh Home Assistant long-lived access token, set HA_TOKEN again, and rerun npm run smoke.",
      ].join("\n"),
    );
    expect(result.stderr).not.toContain("secret-token");
    expect(result.stderr).not.toContain("ha.example.com");
  });

  it("returns sanitized Home Assistant diagnostics on stderr", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("secret-token https://ha.example.com connection failed");
      }),
    );

    const result = await runSmokeCheck({
      env: {
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com",
      },
      envFilePath: null,
    });

    expect(result).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "Smoke test Home Assistant error: Home Assistant request failed.",
    });
  });
});

function stubStatesResponse(payload: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
  );
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
