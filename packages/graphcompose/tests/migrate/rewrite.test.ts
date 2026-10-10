/**
 * #195: `gc migrate imports` rewrites old deep imports to the new public entries — split by where
 * each name lives now, renamed names under their new name, merged per entry, suppressions removed.
 */
import { describe, expect, it } from "vitest";
import { frameworkMoves } from "../../src/migrate/moves.js";
import { migrateImports } from "../../src/migrate/rewrite.js";

/** The suppression the old deep imports needed (spelled in parts: the budget counts real ones). */
const DISABLE = ["// eslint-disable-next-line", "no-restricted-imports"].join(" ");
const moves = frameworkMoves();
const migrate = (text: string) => migrateImports(text, "src/x.ts", moves);

describe("migrateImports (#195)", () => {
  it("merges the old entries into one root import and drops their lint suppressions", () => {
    const before = [
      DISABLE,
      'import { Workflow, provide } from "graphcompose/core";',
      DISABLE,
      'import { from } from "graphcompose/router";',
      `${DISABLE} -- the settings builder`,
      'import { WorkflowSettings, type WorkflowDefinition } from "graphcompose/core";',
      'import { usd } from "graphcompose/units";',
      "// a comment that stays",
      'import { TerminalUserChannel } from "graphcompose/channels";',
      "",
      "export const x = 1;",
      "",
    ].join("\n");

    const after = migrate(before);

    expect(after.text).toBe(
      [
        'import { Workflow, provide, from, WorkflowSettings, type WorkflowDefinition, TerminalUserChannel } from "graphcompose";',
        'import { usd } from "graphcompose/units";',
        "// a comment that stays",
        "",
        "export const x = 1;",
        "",
      ].join("\n"),
    );
    expect(after).toMatchObject({ changed: true, warnings: [] });
  });

  it("imports renamed names under their new name and keeps the local name", () => {
    const after = migrate(
      [
        'import { Injectable, ROUTER_FACTORY, type Router } from "graphcompose/core";',
        'import type { Duration } from "graphcompose/testing";',
        'import { testWith } from "graphcompose/testing";',
      ].join("\n"),
    );

    expect(after.text).toBe(
      [
        'import { Injectable, ROUTER_FACTORY, type RouterEngine as Router } from "graphcompose";',
        'import type { ClockDuration as Duration } from "graphcompose/testing";',
        'import { testWith } from "graphcompose/testing";',
      ].join("\n"),
    );
  });

  it("moves the MCP service names from the root to graphcompose/mcp, merging with what is there", () => {
    const after = migrate(
      [
        'import { McpTool } from "graphcompose/mcp";',
        'import { createApp, createMcpService, McpServer as Expose } from "graphcompose";',
      ].join("\n"),
    );

    expect(after.text).toBe(
      [
        'import { McpTool, createMcpService, McpExpose as Expose } from "graphcompose/mcp";',
        'import { createApp } from "graphcompose";',
      ].join("\n"),
    );
  });

  it("rewrites re-exports, type-only imports, namespaces, import() and import types", () => {
    const after = migrate(
      [
        'export { Agent as A, type Router } from "graphcompose/core";',
        'import type { ToolContext } from "graphcompose/tool";',
        'import * as graph from "graphcompose/graph";',
        'import * as core from "graphcompose/core";',
        'import "graphcompose/concurrency";',
        'export type T = typeof import("graphcompose/tool");',
        'export const load = () => import("graphcompose/graph");',
      ].join("\n"),
    );

    expect(after.text).toBe(
      [
        'export { Agent as A, type RouterEngine as Router } from "graphcompose";',
        'import type { ToolContext } from "graphcompose";',
        'import * as graph from "graphcompose";',
        'import * as core from "graphcompose";',
        'import "graphcompose";',
        'export type T = typeof import("graphcompose");',
        'export const load = () => import("graphcompose");',
      ].join("\n"),
    );
    // `core.Router` was the engine type: a namespace use of a renamed name needs a look by hand
    expect(after.warnings).toEqual([
      'src/x.ts:4: "graphcompose/core" as a whole — renamed or moved there: Router; check them by hand',
    ]);
  });

  it("leaves current imports alone, and a second run changes nothing", () => {
    const current = [
      'import { Agent, Router } from "graphcompose";',
      'import { Agent as Other } from "graphcompose";',
      'import { Text } from "graphcompose/dto";',
      'import { helper } from "./helper.js";',
    ].join("\n");
    expect(migrate(current)).toEqual({ text: current, changed: false, warnings: [] });

    const once = migrate(
      'import { Agent } from "graphcompose/core";\nimport { Agent } from "graphcompose";',
    );
    expect(once.text).toBe('import { Agent } from "graphcompose";');
    expect(migrate(once.text).changed).toBe(false);
  });
});
