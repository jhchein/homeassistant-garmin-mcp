import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { getCurrentStatsEnvelope } from "./currentStats.js";
import { readRecentStats } from "./recentStats.js";

export { getCurrentStatsEnvelope } from "./currentStats.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "homeassistant-garmin-mcp",
    version: "0.1.0",
  });

  server.tool("get_current_stats", "Return factual current Garmin-derived stats from Home Assistant.", {}, async () => {
    const envelope = await getCurrentStatsEnvelope();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(envelope, null, 2),
        },
      ],
    };
  });

  server.registerTool(
    "get_recent_stats",
    {
      description: "Return factual recent Garmin-derived stats from Home Assistant.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(28).default(7),
      }),
    },
    async (args) => {
      const result = await readRecentStats({ days: args.days });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.envelope, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
