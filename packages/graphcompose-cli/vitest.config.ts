import { defineConfig } from "vitest/config";

/** `graphcompose/<entry>` → the framework's source, the same modules its test fixtures import. */
const framework = new URL("../graphcompose/src/", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
      { find: /^graphcompose$/, replacement: `${framework}index.ts` },
      { find: /^graphcompose\/testing\/setup$/, replacement: `${framework}testing/setup.ts` },
      { find: /^graphcompose\/internal$/, replacement: `${framework}internal.ts` },
      { find: /^graphcompose\/([\w-]+)$/, replacement: `${framework}$1/index.ts` },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // a test that asserts nothing proves nothing (#180)
    expect: { requireAssertions: true },
    exclude: ["node_modules/**"],
    // the workflow matchers, from the same source as the fixtures (a setup file skips the aliases)
    setupFiles: [`${framework}testing/setup.ts`],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // thin entry points and interactive prompts, exercised by hand and by the e2e tests' `gc` runs
      exclude: [
        "src/cli.ts",
        "src/cli/main.ts",
        "src/cli/create.ts",
        "src/cli/generate.ts",
        "src/scaffold/questions.ts",
        "src/describe.ts",
        "src/check.ts",
        "src/rag-index.ts",
        "src/chat.ts",
        "src/cli/ask.ts",
        "src/eval/cli.ts",
        "src/eval/cli-deps.ts",
        "src/eval/compare-cli.ts",
      ],
      reporter: ["text", "html", "json-summary"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
