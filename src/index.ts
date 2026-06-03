#!/usr/bin/env node
import { runServer } from "./server.js";

runServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`homeassistant-garmin-mcp failed: ${message}`);
  process.exitCode = 1;
});
