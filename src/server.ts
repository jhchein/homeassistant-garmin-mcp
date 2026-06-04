import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ConfigError, loadConfig } from "./config.js";
import { fetchHomeAssistantStates, HomeAssistantError } from "./homeAssistantClient.js";
import { normalizeCurrentStats, unavailableStats } from "./normalize.js";

export interface CurrentStatsEnvelopeOptions {
  capturedAt?: Date;
  env?: NodeJS.ProcessEnv;
  envFilePath?: string | null;
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "homeassistant-garmin-mcp",
    version: "0.1.0"
  });

  server.tool(
    "get_current_stats",
    "Return factual current Garmin-derived stats from Home Assistant.",
    {},
    async () => {
      const envelope = await getCurrentStatsEnvelope();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(envelope, null, 2)
          }
        ]
      };
    }
  );

  return server;
}

export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function getCurrentStatsEnvelope(options: CurrentStatsEnvelopeOptions = {}) {
  try {
    const config = loadConfig(options.env, options.envFilePath);
    const states = await fetchHomeAssistantStates(config);
    return normalizeCurrentStats(states, {
      ...(options.capturedAt ? { capturedAt: options.capturedAt } : {}),
      staleAfterHours: config.staleAfterHours
    });
  } catch (error: unknown) {
    if (error instanceof ConfigError || error instanceof HomeAssistantError) {
      return unavailableStats(options.capturedAt);
    }

    throw error;
  }
}
