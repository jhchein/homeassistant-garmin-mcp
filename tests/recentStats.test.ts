import { afterEach, describe, expect, it, vi } from "vitest";

import { readRecentStats } from "../src/recentStats.js";

const capturedAt = new Date("2026-06-29T10:00:00.000Z");

describe("readRecentStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the correct UTC start for west-of-UTC time zones", async () => {
    const fetchMock = stubResponses([
      { time_zone: "America/New_York" },
      [
        [
          historyState("sensor.sleep_score", "82", "2026-06-28T05:00:00.000Z"),
          historyStateRaw("sensor.sleep_score", "88", "invalid-timestamp", "2026-06-29T05:00:00.000Z"),
          historyState("sensor.sleep_score", "90", "2026-06-29T05:00:00.000Z"),
        ],
      ],
    ]);

    const result = await readRecentStats({
      capturedAt,
      days: 2,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const historyUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(historyUrl).toContain("https://ha.example.com/api/history/period/2026-06-28T04:00:00.000Z");

    if (!result.ok) {
      throw new Error("Expected recent stats request to succeed.");
    }

    expect(result.envelope.source.time_zone).toBe("America/New_York");
  });

  it("uses the correct range start across a DST boundary", async () => {
    const fetchMock = stubResponses([{ time_zone: "America/New_York" }, [[]]]);

    const result = await readRecentStats({
      capturedAt: new Date("2026-03-09T12:00:00.000Z"),
      days: 2,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const historyUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(historyUrl).toContain("https://ha.example.com/api/history/period/2026-03-08T05:00:00.000Z");
    expect(historyUrl).toContain("end_time=2026-03-09T12%3A00%3A00.000Z");

    if (!result.ok) {
      throw new Error("Expected recent stats request to succeed.");
    }

    expect(result.envelope.stats_by_day.map((day) => day.date)).toEqual(["2026-03-08", "2026-03-09"]);
  });

  it("returns recent stats by Home Assistant calendar day", async () => {
    const fetchMock = stubResponses([
      { time_zone: "Europe/Berlin" },
      [
        [
          historyState("sensor.sleep_score", "82", "2026-06-28T05:00:00.000Z"),
          historyStateRaw("sensor.sleep_score", "88", "invalid-timestamp", "2026-06-29T05:00:00.000Z"),
          historyState("sensor.sleep_score", "90", "2026-06-29T05:00:00.000Z"),
          historyState("sensor.sleep_score", "unknown", "2026-06-29T09:30:00.000Z"),
        ],
        [
          historyState("sensor.garmin_connect_training_readiness", "84", "2026-06-29T06:00:00.000Z"),
          historyState("sensor.garmin_connect_training_readiness", "85", "2026-06-29T06:00:00.000Z"),
        ],
        [historyState("sensor.garmin_connect_morning_training_readiness", "92", "2026-06-29T04:30:00.000Z")],
        [
          historyState("sensor.resting_heart_rate", "unknown", "2026-06-28T06:00:00.000Z"),
          historyState("sensor.resting_heart_rate", "unavailable", "2026-06-29T06:00:00.000Z"),
        ],
        [historyState("sensor.garmin_connect_yesterday_steps", "12345", "2026-06-29T06:30:00.000Z")],
      ],
    ]);

    const result = await readRecentStats({
      capturedAt,
      days: 2,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://ha.example.com/api/config");

    const historyUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(historyUrl).toContain("https://ha.example.com/api/history/period/2026-06-27T22:00:00.000Z");
    expect(historyUrl).toContain("end_time=2026-06-29T10%3A00%3A00.000Z");

    expect(result.envelope).toMatchObject({
      captured_at: "2026-06-29T10:00:00.000Z",
      missing: expect.arrayContaining([
        "stats_by_day.2026-06-28.cardio.resting_heart_rate",
        "stats_by_day.2026-06-29.cardio.resting_heart_rate",
        "stats_by_day.2026-06-28.sleep.duration",
        "stats_by_day.2026-06-29.recovery.training_status",
      ]),
      stale: [],
      source: {
        history_source: "home_assistant_recorder",
        range_end: "2026-06-29T10:00:00.000Z",
        range_start: "2026-06-27T22:00:00.000Z",
        time_zone: "Europe/Berlin",
      },
    });

    expect(result.envelope.stats_by_day).toEqual([
      {
        date: "2026-06-28",
        sleep: {
          score: statValue("sensor.sleep_score", 82, "2026-06-28T05:00:00.000Z"),
        },
        recovery: {},
        hrv: {},
        cardio: {},
        stress: {},
        body_battery: {},
        activity: {},
        fitness: {},
        body_composition: {},
      },
      {
        date: "2026-06-29",
        sleep: {
          score: statValue("sensor.sleep_score", 90, "2026-06-29T05:00:00.000Z"),
        },
        recovery: {
          training_readiness: statValue("sensor.garmin_connect_training_readiness", 85, "2026-06-29T06:00:00.000Z"),
          morning_training_readiness: statValue(
            "sensor.garmin_connect_morning_training_readiness",
            92,
            "2026-06-29T04:30:00.000Z",
          ),
          watch_training_readiness: {
            ...statValue("sensor.garmin_connect_morning_training_readiness", 92, "2026-06-29T04:30:00.000Z"),
            source_field: "morning_training_readiness",
          },
        },
        hrv: {},
        cardio: {},
        stress: {},
        body_battery: {},
        activity: {
          yesterday_steps: statValue("sensor.garmin_connect_yesterday_steps", 12345, "2026-06-29T06:30:00.000Z"),
        },
        fitness: {},
        body_composition: {},
      },
    ]);
  });

  it.each([29, 0])("falls back to 7 days for invalid days input %s", async (days) => {
    const fetchMock = stubResponses([{ time_zone: "UTC" }, [[]]]);

    const result = await readRecentStats({
      capturedAt,
      days,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "https://ha.example.com/api/history/period/2026-06-23T00:00:00.000Z",
    );

    if (!result.ok) {
      throw new Error("Expected recent stats request to succeed.");
    }

    expect(result.envelope.stats_by_day).toHaveLength(7);
  });

  it("skips invalid timestamps and unknown states when selecting the latest known state", async () => {
    const fetchMock = stubResponses([
      { time_zone: "UTC" },
      [
        [
          historyState("sensor.sleep_score", "unknown", "2026-06-29T05:00:00.000Z"),
          historyStateRaw("sensor.sleep_score", "88", "invalid-timestamp", "also-invalid"),
          historyState("sensor.sleep_score", "91", "2026-06-29T07:00:00.000Z"),
        ],
      ],
    ]);

    const result = await readRecentStats({
      capturedAt,
      days: 1,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    if (!result.ok) {
      throw new Error("Expected recent stats request to succeed.");
    }

    expect(result.envelope.stats_by_day).toHaveLength(1);
    expect(result.envelope.stats_by_day[0]?.sleep.score).toEqual(
      statValue("sensor.sleep_score", 91, "2026-06-29T07:00:00.000Z"),
    );
  });

  it("emits missing paths for a sparse day with no history", async () => {
    const fetchMock = stubResponses([
      { time_zone: "Europe/Berlin" },
      [[historyState("sensor.sleep_score", "91", "2026-06-29T05:00:00.000Z")]],
    ]);

    const result = await readRecentStats({
      capturedAt,
      days: 2,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "24",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.envelope.missing).toEqual(
      expect.arrayContaining([
        "stats_by_day.2026-06-28.sleep.score",
        "stats_by_day.2026-06-28.recovery.training_readiness",
        "stats_by_day.2026-06-28.cardio.resting_heart_rate",
        "stats_by_day.2026-06-28.body_battery.current",
      ]),
    );
  });

  it("marks only current-day required fields as stale", async () => {
    const fetchMock = stubResponses([
      { time_zone: "Europe/Berlin" },
      [
        [
          historyState("sensor.sleep_score", "82", "2026-06-28T05:00:00.000Z"),
          historyState("sensor.sleep_score", "90", "2026-06-29T05:00:00.000Z"),
        ],
      ],
    ]);

    const result = await readRecentStats({
      capturedAt,
      days: 2,
      env: {
        HA_REQUEST_TIMEOUT_MS: "1000",
        HA_STALE_AFTER_HOURS: "2",
        HA_TOKEN: "secret-token",
        HA_URL: "https://ha.example.com/",
      },
      envFilePath: null,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.envelope).toMatchObject({
      stale: ["stats_by_day.2026-06-29.sleep.score"],
    });
  });
});

function stubResponses(payloads: unknown[]) {
  const responses = payloads.map((payload) => new Response(JSON.stringify(payload), { status: 200 }));
  const fetchMock = vi.fn(async () => {
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected fetch call.");
    }
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function historyState(entityId: string, value: string, updatedAt: string) {
  return {
    entity_id: entityId,
    state: value,
    attributes: { unit_of_measurement: "units" },
    last_changed: updatedAt,
    last_updated: updatedAt,
  };
}

function historyStateRaw(entityId: string, value: string, lastUpdated: string, lastChanged: string) {
  return {
    entity_id: entityId,
    state: value,
    attributes: { unit_of_measurement: "units" },
    last_changed: lastChanged,
    last_updated: lastUpdated,
  };
}

function statValue(entityId: string, value: number, updatedAt: string) {
  return {
    entity_id: entityId,
    last_changed: updatedAt,
    last_updated: updatedAt,
    unit: "units",
    value,
  };
}
