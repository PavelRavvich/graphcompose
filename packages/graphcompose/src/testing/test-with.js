import { test } from "vitest";
import { TestEnvironment } from "./environment.js";
import { blockNetwork } from "./network-guard.js";
import { createTestApp } from "./test-app.js";
import "./vitest-types.js";
/**
 * A Vitest `test` for a workflow, like Spring's test context: each test gets the real container,
 * components and graph rules as `app`, with models scripted (`mockLlm`), MCP servers stubbed
 * (`mcpOf`) and the network blocked (`allowNetwork` to open hosts). Per test: memory stores,
 * deterministic ids, a controllable clock; `onStop` of real components runs after the test, also
 * when it failed. `const test = testWith(JobScout)`.
 */
export function testWith(workflow, options = {}) {
  return test.extend({
    testSetup: { workflow, options },
    environment: [
      async ({ testSetup }, use) => {
        const environment = await TestEnvironment.of(testSetup.workflow, testSetup.options);
        const unblock = blockNetwork({
          allowed: testSetup.options.allowNetwork ?? [],
          onBlocked: (error) => environment.book.report(error),
        });
        try {
          await use(environment);
        } finally {
          unblock();
          await environment.close();
        }
      },
      { auto: true },
    ],
    app: async ({ environment }, use) => {
      await use(createTestApp(environment));
    },
    recoverApp: async ({ environment, app }, use) => {
      let current = app;
      await use(async () => {
        await current.close();
        current = createTestApp(environment);
        return current;
      });
    },
    mockLlm: async ({ environment }, use) => {
      await use((component) => environment.mockLlm(component));
    },
    mockSubworkflow: async ({ environment }, use) => {
      await use((workflow) => environment.mockSubworkflow(workflow));
    },
    mockOf: async ({ environment }, use) => {
      await use((component) => environment.mockOf(component));
    },
    mcpOf: async ({ environment }, use) => {
      await use((server) => environment.mcpOf(server));
    },
  });
}
