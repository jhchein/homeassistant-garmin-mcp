import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { ENTITY_DEFINITIONS, LAST_SYNC_ENTITY_ID } from "../src/entityMap.js";
import { createServer } from "../src/server.js";

const currentUpdatedAt = "2026-06-03T11:55:00.000Z";

describe("createServer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

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

  it("returns recent stats as text JSON through the MCP tool", async () => {
    vi.stubEnv("HA_TOKEN", "secret-token");
    vi.stubEnv("HA_URL", "https://ha.example.com");
    vi.stubEnv("HA_STALE_AFTER_HOURS", "100000");
    stubRecentStatsResponses([{ time_zone: "Europe/Berlin" }, [[]]]);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.1.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({ name: "get_recent_stats", arguments: {} });

      if (!("content" in result)) {
        throw new Error("Expected MCP content result.");
      }

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({ type: "text" });

      const textContent = result.content[0];
      if (textContent.type !== "text") {
        throw new Error("Expected MCP text content.");
      }

      const envelope = JSON.parse(textContent.text) as { stats_by_day: unknown[] };
      expect(envelope.stats_by_day).toHaveLength(7);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("rejects invalid recent-stats days before calling fetch", async () => {
    vi.stubEnv("HA_TOKEN", "secret-token");
    vi.stubEnv("HA_URL", "https://ha.example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.1.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client
        .callTool({ name: "get_recent_stats", arguments: { days: 0 } })
        .catch((error: unknown) => error);

      expect(fetchMock).not.toHaveBeenCalled();

      if (result && typeof result === "object" && "code" in result) {
        expect(result).toMatchObject({ code: -32602 });
      } else {
        expect(result).toMatchObject({ isError: true });
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});

function stubStatesResponse(payload: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
  );
}

function stubRecentStatsResponses(payloads: unknown[]): void {
  const responses = payloads.map((payload) => new Response(JSON.stringify(payload), { status: 200 }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const response = responses.shift();
      if (!response) {
        throw new Error("Unexpected fetch call.");
      }

      return response;
    }),
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
