import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads Home Assistant settings from explicit environment variables", () => {
    const config = loadConfig(
      {
        HA_URL: "https://ha.example.com/",
        HA_TOKEN: "token",
        HA_REQUEST_TIMEOUT_MS: "2000",
        HA_STALE_AFTER_HOURS: "12",
      },
      null,
    );

    expect(config).toEqual({
      haUrl: "https://ha.example.com",
      haToken: "token",
      requestTimeoutMs: 2000,
      staleAfterHours: 12,
    });
  });

  it("loads Home Assistant settings from a local env file", () => {
    const { envFilePath, cleanup } = createEnvFile(`
HA_URL=https://ha.example.com
HA_TOKEN="file-token"
HA_REQUEST_TIMEOUT_MS=3000
HA_STALE_AFTER_HOURS=18
`);

    try {
      const config = loadConfig({}, envFilePath);

      expect(config.haUrl).toBe("https://ha.example.com");
      expect(config.haToken).toBe("file-token");
      expect(config.requestTimeoutMs).toBe(3000);
      expect(config.staleAfterHours).toBe(18);
    } finally {
      cleanup();
    }
  });

  it("lets explicit environment variables override env file values", () => {
    const { envFilePath, cleanup } = createEnvFile(`
HA_URL=https://file.example.com
HA_TOKEN=file-token
`);

    try {
      const config = loadConfig({ HA_URL: "https://env.example.com", HA_TOKEN: "env-token" }, envFilePath);

      expect(config.haUrl).toBe("https://env.example.com");
      expect(config.haToken).toBe("env-token");
    } finally {
      cleanup();
    }
  });

  it("loads Home Assistant settings from HA_ENV_FILE", () => {
    const { envFilePath, cleanup } = createEnvFile(`
HA_URL=https://file-pointer.example.com
HA_TOKEN=file-pointer-token
`);

    try {
      const config = loadConfig({ HA_ENV_FILE: envFilePath }, null);

      expect(config.haUrl).toBe("https://file-pointer.example.com");
      expect(config.haToken).toBe("file-pointer-token");
    } finally {
      cleanup();
    }
  });

  it("rejects missing required Home Assistant settings", () => {
    expect(() => loadConfig({}, null)).toThrow("Missing required configuration HA_URL.");
    expect(() => loadConfig({ HA_URL: "https://ha.example.com" }, null)).toThrow(
      "Missing required configuration HA_TOKEN.",
    );
  });

  it("ignores malformed env file lines and falls back for invalid optional numbers", () => {
    const { envFilePath, cleanup } = createEnvFile(`
# comment
export HA_URL='https://ha.example.com/'
HA_TOKEN=token
MALFORMED_LINE
=ignored
HA_REQUEST_TIMEOUT_MS=0
HA_STALE_AFTER_HOURS=not-a-number
`);

    try {
      const config = loadConfig({}, envFilePath);

      expect(config).toEqual({
        haUrl: "https://ha.example.com",
        haToken: "token",
        requestTimeoutMs: 10_000,
        staleAfterHours: 24,
      });
    } finally {
      cleanup();
    }
  });
});

function createEnvFile(contents: string): { envFilePath: string; cleanup: () => void } {
  const directory = mkdtempSync(join(tmpdir(), "homeassistant-garmin-mcp-"));
  const envFilePath = join(directory, ".env");
  writeFileSync(envFilePath, contents, "utf8");

  return {
    envFilePath,
    cleanup: () => rmSync(directory, { force: true, recursive: true }),
  };
}
