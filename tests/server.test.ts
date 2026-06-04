import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { ENTITY_DEFINITIONS, LAST_SYNC_ENTITY_ID } from "../src/entityMap.js";
import { createServer, getCurrentStatsEnvelope } from "../src/server.js";

const capturedAt = new Date("2026-06-03T12:00:00.000Z");
const currentUpdatedAt = "2026-06-03T11:55:00.000Z";

describe("getCurrentStatsEnvelope", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns a full current-stats envelope from Home Assistant states", async () => {
    const fetchMock = stubStatesResponse([
      ...ENTITY_DEFINITIONS.map((definition, index) => state(definition.entityId, String(index + 1))),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z"),
    ]);

    const result = await getCurrentStatsEnvelope({
      capturedAt,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.status).toBe("full");
    expect(result.captured_at).toBe("2026-06-03T12:00:00.000Z");
    expect(result.missing).toEqual([]);
    expect(result.stale).toEqual([]);
    expect(result.stats.sleep["score"]?.value).toBe(6);
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

  it("returns unavailable stats for configuration or Home Assistant failures", async () => {
    const missingConfigResult = await getCurrentStatsEnvelope({ env: {}, envFilePath: null, capturedAt });

    expect(missingConfigResult).toMatchObject({
      captured_at: "2026-06-03T12:00:00.000Z",
      missing: ["home_assistant"],
      status: "unavailable",
    });

    stubResponse(new Response("unauthorized", { status: 401 }));

    const authFailureResult = await getCurrentStatsEnvelope({
      capturedAt,
      env: { HA_TOKEN: "secret-token", HA_URL: "https://ha.example.com" },
      envFilePath: null,
    });

    expect(authFailureResult).toMatchObject({
      captured_at: "2026-06-03T12:00:00.000Z",
      missing: ["home_assistant"],
      status: "unavailable",
    });
  });
});

describe("createServer", () => {
  it("creates a disconnected MCP server for the current-stats tool", () => {
    const server = createServer();

    expect(server.isConnected()).toBe(false);
  });

  it("returns the current-stats envelope as text JSON through the MCP tool", async () => {
    vi.stubEnv("HA_TOKEN", "secret-token");
    vi.stubEnv("HA_URL", "https://ha.example.com");
    vi.stubEnv("HA_STALE_AFTER_HOURS", "100000");
    stubStatesResponse([
      ...ENTITY_DEFINITIONS.map((definition, index) => state(definition.entityId, String(index + 1))),
      state(LAST_SYNC_ENTITY_ID, "2026-06-03T11:58:00.000Z"),
    ]);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.1.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({ name: "get_current_stats", arguments: {} });

      if (!("content" in result)) {
        throw new Error("Expected MCP content result.");
      }

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({ type: "text" });

      const textContent = result.content[0];
      if (textContent.type !== "text") {
        throw new Error("Expected MCP text content.");
      }

      const envelope = JSON.parse(textContent.text) as { status: string; missing: string[]; stale: string[] };
      expect(envelope.status).toBe("full");
      expect(envelope.missing).toEqual([]);
      expect(envelope.stale).toEqual([]);
    } finally {
      await client.close();
      await server.close();
    }
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
