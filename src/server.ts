import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getCurrentStatsEnvelope } from "./currentStats.js";

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

  return server;
}

export async function runServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
