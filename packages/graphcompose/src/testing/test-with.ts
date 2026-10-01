import { test, type Mocked, type TestAPI } from "vitest";
import type { Class } from "../components/injection.js";
import type { McpServerClient, ServerTools } from "../components/mcp-client.js";
import type { FlowNode } from "../graph/flow.js";
import { TestEnvironment, type TestWithOptions } from "./environment.js";
import type { McpStub } from "./mcp-stubs.js";
import { blockNetwork } from "./network-guard.js";
import type { ModelScript } from "./script-book.js";
import { createTestApp, type TestApp } from "./test-app.js";
import "./vitest-types.js";

/** What every test of `testWith(Workflow)` gets as its fixtures. */
export interface WorkflowFixtures {
  /** The workflow's real container and graph, everything external replaced; built on first use. */
  readonly app: TestApp;
  /**
   * Closes the current app (its `onStop` hooks run, as on a real stop) and returns a new one over
   * the same test state (checkpoints, ledger, clock, ids) — "a paused run survives a restart".
   * The closed app fails every call with `test.app-closed`.
   */
  readonly restartApp: () => Promise<TestApp>;
  /** The script of an agent or a router (by class): `modelOf(Scout).respond(answer("…"))`. */
  readonly modelOf: (component: FlowNode) => ModelScript;
  /** A typed mock injected instead of a component; the same instance the app uses. */
  readonly mockOf: <T>(component: Class<T>) => Mocked<T>;
  /** The stub of an MCP server: `mcpOf(ShortlistServer).respond({ write_file: … })`. */
  readonly mcpOf: <TServer extends McpServerClient<ServerTools>>(
    server: new () => TServer,
  ) => McpStub<TServer>;
}

interface Internal {
  readonly testSetup: { readonly workflow: Class; readonly options: TestWithOptions };
  readonly environment: TestEnvironment;
}

/**
 * A Vitest `test` for a workflow, like Spring's test context: each test gets the real container,
 * components and graph rules as `app`, with models scripted (`modelOf`), MCP servers stubbed
 * (`mcpOf`) and the network blocked (`allowNetwork` to open hosts). Per test: memory stores,
 * deterministic ids, a controllable clock; `onStop` of real components runs after the test, also
 * when it failed. `const test = testWith(JobScout)`.
 */
export function testWith(
  workflow: Class,
  options: TestWithOptions = {},
): TestAPI<WorkflowFixtures> {
  return test.extend<Internal & WorkflowFixtures>({
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
    restartApp: async ({ environment, app }, use) => {
      let current = app;
      await use(async () => {
        await current.close();
        current = createTestApp(environment);
        return current;
      });
    },
    modelOf: async ({ environment }, use) => {
      await use((component) => environment.modelOf(component));
    },
    mockOf: async ({ environment }, use) => {
      await use((component) => environment.mockOf(component));
    },
    mcpOf: async ({ environment }, use) => {
      await use((server) => environment.mcpOf(server));
    },
  });
}
