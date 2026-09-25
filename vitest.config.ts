import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/smoke/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // thin entry points, exercised by `make smoke` / `npm run studio`
      exclude: [
        "src/cli.ts",
        "src/chat.ts",
        "src/cli/ask.ts",
        "src/studio.ts",
        "src/eval/cli.ts",
        "src/demos/studio.ts",
        "src/graph/studio-graph.ts",
        "src/demos/job-scout/probe-boards.ts",
        "src/config/write-profile-schema.ts",
      ],
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
