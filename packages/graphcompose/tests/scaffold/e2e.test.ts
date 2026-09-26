/**
 * #93 AC1 / AC2: a generated project compiles, passes its own tests and the framework's lint rules, and
 * its workflow assembles — right after `create` and after each `generate`. Generated inside the monorepo
 * (its installed dependencies); a real `npm install` is the manual check M1.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { specFromFlags } from "../../src/scaffold/flags.js";
import { planGenerate } from "../../src/scaffold/generate.js";
import type { WorkflowSpec } from "../../src/scaffold/plan.js";
import { planProject } from "../../src/scaffold/project.js";
import { applyChanges } from "../../src/scaffold/write.js";

const repo = new URL("../../../..", import.meta.url).pathname;
const bin = (path: string): string => join(repo, "node_modules", path);
const tmp = new URL("../../.scaffold-tmp", import.meta.url).pathname;
const project = join(tmp, `desk-${String(process.pid)}`);

const run = (
  command: string,
  args: readonly string[],
  cwd = project,
): { ok: boolean; out: string } => {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { ok: result.status === 0, out: `${result.stdout}${result.stderr}` };
};

/** tsc, the project's own tests, the framework's ESLint rules, and `gc describe` on its workflow. */
function check(workflow: string): string {
  const tsc = run(bin("typescript/bin/tsc"), ["-p", join(project, "tsconfig.json")]);
  expect(tsc.out).toBe("");
  const tests = run(bin("vitest/vitest.mjs"), ["run", "--root", project]);
  expect(tests.ok, tests.out).toBe(true);
  const lint = run(bin("eslint/bin/eslint.js"), ["--no-ignore", join(project, "src")], repo);
  expect(lint.ok, lint.out).toBe(true);
  const describeOut = run(join(repo, "packages/graphcompose/bin/graphcompose.js"), [
    "describe",
    "--workflow",
    workflow,
  ]);
  expect(describeOut.ok, describeOut.out).toBe(true);
  return describeOut.out;
}

const scripts = (): Record<string, string> =>
  (
    JSON.parse(readFileSync(join(project, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    }
  ).scripts;

afterAll(() => {
  rmSync(project, { recursive: true, force: true });
});

describe("gc create / gc generate end to end", () => {
  it("AC1: create → a project that compiles, passes its tests and lint, and whose workflow assembles", async () => {
    mkdirSync(tmp, { recursive: true });
    const spec = specFromFlags("desk", {
      yes: true,
      agents: "triage:Sorts requests,answerer:Answers questions",
      tools: "answerer:search_orders",
      mcp: `filesystem:${tmp}`,
      rag: "notes",
    }) as WorkflowSpec;
    await applyChanges(project, { create: planProject(spec), modify: [] });

    const out = check("src/desk/desk.workflow.ts");

    expect(out).toContain("desk 0.1.0");
    // create wires the MCP server and the knowledge base into the first agent
    expect(out).toMatch(/triage .*\n\s+Sorts requests\n\s+rag: desk_notes \(tool, k 3\)/);
    expect(out).toContain("· search_orders (read, local)");
    expect(out).toContain("· read_desk_files (read, MCP desk_files)");
    // #107 AC2: files named by kind, the prompt next to its agent (no prompt parameter)
    for (const file of [
      "agents/answerer.agent.ts",
      "agents/answerer.prompt.md",
      "tools/search-orders.tool.ts",
      "tools/search-orders.tool.test.ts",
      "mcp/desk-files.server.ts",
      "mcp/read-desk-files.mcp.ts",
      "rag/desk-notes.rag.ts",
    ]) {
      expect(existsSync(join(project, "src/desk", file)), file).toBe(true);
    }
    expect(readFileSync(join(project, "src/desk/agents/answerer.agent.ts"), "utf8")).not.toContain(
      "prompt:",
    );
    expect(scripts().chat).toBe("graphcompose chat --workflow src/desk/desk.workflow.ts");
  }, 240_000);

  it("AC2: generate agent, tool, mcp, rag and workflow — each wired, the project still compiles and passes", async () => {
    const workflow = "src/desk/desk.workflow.ts";
    const steps = [
      planGenerate("agent", "billing", { workflow, description: "Handles invoices" }, project),
    ];
    await applyChanges(project, steps[0] ?? { create: [], modify: [] });
    for (const plan of [
      () => planGenerate("tool", "refund", { workflow, agent: "billing" }, project),
      () =>
        planGenerate(
          "mcp",
          "tickets",
          { workflow, command: "tickets-mcp", tool: "search", agent: "billing" },
          project,
        ),
      () =>
        planGenerate(
          "rag",
          "policies",
          { workflow, folder: "policies", agent: "billing" },
          project,
        ),
      () => planGenerate("workflow", "onboarding", {}, project),
    ]) {
      await applyChanges(project, plan());
    }

    const out = check(workflow);

    expect(out).toMatch(/billing .*\n\s+Handles invoices/);
    expect(out).toContain("rag: policies (tool, k 3)");
    expect(out).toContain("· refund (read, local)");
    expect(out).toContain("· tickets_search (read, MCP tickets)");
    expect(check("src/onboarding/onboarding.workflow.ts")).toContain("onboarding 0.1.0");
    expect(scripts()["chat:onboarding"]).toBeDefined();
  }, 240_000);
});
