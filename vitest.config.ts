import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/index.ts", "src/types.ts"],
      include: ["src/**/*.ts"],
      lines: 90,
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
