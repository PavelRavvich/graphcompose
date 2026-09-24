import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/smoke/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // thin entry points, exercised by `make smoke` / `npm run studio`
      exclude: ["src/cli.ts", "src/studio.ts"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
