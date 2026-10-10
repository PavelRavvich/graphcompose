import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { envelope, fixture, gc, type GcCall } from "./gc.js";

const WORKFLOW = fixture("test-workflow/test.workflow.ts");
const MISSING = fixture("cli/missing.workflow.ts");
const project = mkdtempSync(join(tmpdir(), "gc-198-"));

afterAll(() => {
  rmSync(project, { recursive: true, force: true });
});

/** One line on stderr, no stack trace, nothing on stdout. */
function expectOneLine(call: GcCall, code: number, text: RegExp): void {
  expect(call.code).toBe(code);
  expect(call.stdout).toBe("");
  expect(call.stderr).toMatch(text);
  expect(call.stderr.trimEnd().split("\n")).toHaveLength(1);
  expect(call.stderr).not.toMatch(/\n\s+at /);
}

describe("#198 AC2: usage, project and conflict errors by exit code", () => {
  it("usage → 2: an unknown flag is named, with a pointer to the command's help", async () => {
    expectOneLine(
      await gc(["run", "--workflow", WORKFLOW, "--bogus", "task"]),
      2,
      /unknown option --bogus — see gc help run/,
    );
  });

  it("usage → 2: a missing required option and an unknown command", async () => {
    expectOneLine(
      await gc(["replay", "--workflow", WORKFLOW]),
      2,
      /missing required option --version — see gc help replay/,
    );
    expectOneLine(await gc(["nope"]), 2, /unknown command "nope"/);
    expectOneLine(await gc(["describe", "extra"]), 2, /unexpected argument "extra"/);
  });

  it('gc run --workflow <path> "task" parses: a missing workflow is a project error (3), not usage', async () => {
    expectOneLine(
      await gc(["run", "--workflow", MISSING, "find jobs"]),
      3,
      /Workflow file not found: .*missing\.workflow\.ts/,
    );
    expectOneLine(
      await gc(["run", "--workflow", WORKFLOW]),
      2,
      /missing the task: gc run --workflow <path> "<task>"/,
    );
  });

  it("project → 3 without a stack; --json carries the error, --debug adds the stack", async () => {
    expectOneLine(await gc(["describe", "--workflow", MISSING]), 3, /Workflow file not found/);
    const json = await gc(["describe", "--workflow", MISSING, "--json"]);
    expect(json.code).toBe(3);
    expect(envelope(json)).toMatchObject({
      schema: 1,
      ok: false,
      command: "describe",
      warnings: [],
      error: { code: "workflow.load", message: expect.stringContaining("not found") as string },
    });
    const debug = await gc(["describe", "--workflow", MISSING, "--debug"]);
    expect(debug.code).toBe(3);
    expect(debug.stderr).toMatch(/WorkflowLoadError: Workflow file not found[\s\S]*\n\s+at /);
  });

  it("conflict → 4: gc create over an existing project writes nothing", async () => {
    const first = await gc(["create", "desk", "--yes", "--skip-install", "--json"], project);
    expect(first.code).toBe(0);
    const created = envelope(first);
    expect(created).toMatchObject({ schema: 1, ok: true, command: "create" });
    expect(created.created).toEqual(expect.arrayContaining(["package.json"]));

    const again = await gc(["create", "desk", "--yes", "--skip-install", "--json"], project);

    expect(again.code).toBe(4);
    expect(envelope(again)).toMatchObject({
      ok: false,
      error: {
        code: "scaffold.conflict",
        message: expect.stringMatching(/^Already exists/) as string,
      },
    });
    expect(again.stderr.trimEnd().split("\n")).toHaveLength(1);
  });

  it("usage → 2 for generators too: an unknown kind", async () => {
    expectOneLine(await gc(["g", "widget", "x"], project), 2, /Unknown kind "widget"/);
  });
});
