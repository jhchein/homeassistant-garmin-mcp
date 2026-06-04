import { existsSync, readFileSync } from "node:fs";

export interface AppConfig {
  haUrl: string;
  haToken: string;
  requestTimeoutMs: number;
  staleAfterHours: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, envFilePath: string | null = ".env"): AppConfig {
  const effectiveEnvFilePath = env.HA_ENV_FILE?.trim() || envFilePath;
  const fileEnv = effectiveEnvFilePath ? loadEnvFile(effectiveEnvFilePath) : {};
  const haUrl = readConfigValue("HA_URL", env, fileEnv)?.trim().replace(/\/+$/, "");
  const haToken = readConfigValue("HA_TOKEN", env, fileEnv)?.trim();

  if (!haUrl) {
    throw new ConfigError("Missing required configuration HA_URL.");
  }

  if (!haToken) {
    throw new ConfigError("Missing required configuration HA_TOKEN.");
  }

  return {
    haUrl,
    haToken,
    requestTimeoutMs: parsePositiveInt(readConfigValue("HA_REQUEST_TIMEOUT_MS", env, fileEnv), 10_000),
    staleAfterHours: parsePositiveInt(readConfigValue("HA_STALE_AFTER_HOURS", env, fileEnv), 24),
  };
}

function readConfigValue(name: string, env: NodeJS.ProcessEnv, fileEnv: Record<string, string>): string | undefined {
  return env[name] ?? fileEnv[name];
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvFile(readFileSync(filePath, "utf8"));
}

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const assignment = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = assignment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = assignment.slice(0, separatorIndex).trim();
    const rawValue = assignment.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    values[key] = stripOptionalQuotes(rawValue);
  }

  return values;
}

function stripOptionalQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
