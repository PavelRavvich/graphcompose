/**
 * #193: `gc generate openapi` — one tool per operation with input/output DTOs, an injectable client,
 * wired into the agent and the workflow's providers. The generated code compiles, passes lint,
 * prettier and its own tests, and the tools send the right method, URL and body.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { helpFor } from "../../src/cli/usage.js";
import { ScaffoldError } from "../../src/scaffold/errors.js";
import { specFromFlags } from "../../src/scaffold/flags.js";
import { planGenerate } from "../../src/scaffold/generate.js";
import type { WorkflowSpec } from "../../src/scaffold/plan.js";
import { planProject } from "../../src/scaffold/project.js";
import { applyChanges } from "../../src/scaffold/write.js";
import { ZOO_CHECK } from "../fixtures/openapi/zoo-check.js";

const repo = new URL("../../../..", import.meta.url).pathname;
const bin = (path: string): string => join(repo, "node_modules", path);
const tmp = new URL("../../.scaffold-tmp", import.meta.url).pathname;
const project = join(tmp, `zoo-${String(process.pid)}`);
const spec = new URL("../fixtures/openapi/pets.yaml", import.meta.url).pathname;
const workflow = "src/zoo/zoo.workflow.ts";
const gc = join(repo, "packages/graphcompose/bin/graphcompose.js");

const run = (command: string, args: readonly string[], cwd = project) => {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    out: `${result.stdout}${result.stderr}`,
  };
};
const file = (path: string): string => readFileSync(join(project, "src/zoo", path), "utf8");

beforeAll(async () => {
  mkdirSync(tmp, { recursive: true });
  const workflowSpec = specFromFlags("zoo", {
    yes: true,
    agents: "keeper:Looks after pets,vet:Treats pets",
    mcp: "none",
    rag: "none",
  }) as WorkflowSpec;
  await applyChanges(project, { create: planProject(workflowSpec), modify: [] });
});

afterAll(() => {
  rmSync(project, { recursive: true, force: true });
});

describe("gc generate openapi", () => {
  it("AC1: tools per operation that compile, pass lint, prettier and tests, wired, calling the API right", async () => {
    const plan = await planGenerate(
      "openapi",
      "pets",
      { workflow, agent: "keeper", url: spec },
      project,
    );
    const written = await applyChanges(project, plan);
    writeFileSync(join(project, "src/zoo/pets-openapi.test.ts"), ZOO_CHECK);

    const tsc = run(bin("typescript/bin/tsc"), ["-p", join(project, "tsconfig.json")]);
    expect(tsc.out).toBe("");
    const tests = run(bin("vitest/vitest.mjs"), ["run", "--root", project]);
    expect(tests.ok, tests.out).toBe(true);
    // the generated tests (stubbed API) and the hand-written testWith check all ran
    expect(tests.out).toMatch(/Tests\s+6 passed/);
    const lint = run(bin("eslint/bin/eslint.js"), ["--no-ignore", join(project, "src")], repo);
    expect(lint.ok, lint.out).toBe(true);
    // the files it writes and the rewired agent (the workflow module is not prettier-clean from `gc create`)
    const files = [...plan.create.map((f) => f.path), "src/zoo/agents/keeper.agent.ts"].map(
      (path) => join(project, path),
    );
    const prettier = run(
      bin("prettier/bin/prettier.cjs"),
      ["--check", "--ignore-path", join(tmp, "none"), ...files],
      repo,
    );
    expect(prettier.ok, prettier.out).toBe(true);
    const described = run(gc, ["describe", "--workflow", workflow]);
    expect(described.ok, described.out).toBe(true);
    for (const tool of ["get_pet", "delete_pet", "list_pets", "create_pet"])
      expect(described.out).toContain(`· ${tool} (local)`);

    // layout: tools/<operation>.{tool,tool.test,dto}.ts and services/<name>-api.service.ts, nothing at the root
    expect(written.sort()).toEqual(
      [
        "services/pets-api.service.ts",
        "tools/create-pet.dto.ts",
        "tools/create-pet.tool.test.ts",
        "tools/create-pet.tool.ts",
        "tools/delete-pet.dto.ts",
        "tools/delete-pet.tool.test.ts",
        "tools/delete-pet.tool.ts",
        "tools/get-pet.dto.ts",
        "tools/get-pet.tool.test.ts",
        "tools/get-pet.tool.ts",
        "tools/list-pets.dto.ts",
        "tools/list-pets.tool.test.ts",
        "tools/list-pets.tool.ts",
        "agents/keeper.agent.ts",
        "zoo.workflow.ts",
      ]
        .map((path) => `src/zoo/${path}`)
        .sort(),
    );
    expect(file("agents/keeper.agent.ts")).toContain(
      "tools: [GetPetTool, DeletePetTool, ListPetsTool, CreatePetTool]",
    );
    expect(file("zoo.workflow.ts")).toContain("providers: [PetsApi]");
    // typed DTOs, no `any`; path parameters filled in
    expect(file("tools/get-pet.tool.ts")).toContain(
      "implements ToolHandler<GetPetInput, GetPetOutput>",
    );
    expect(file("tools/delete-pet.tool.ts")).toContain(
      "implements ToolHandler<DeletePetInput, PlainText>",
    );
    expect(file("tools/list-pets.tool.ts")).toContain(
      "implements ToolHandler<NoInput, ListPetsOutput>",
    );
    expect(file("tools/get-pet.tool.ts")).toContain(
      "path: `/pets/${encodeURIComponent(String(input.id))}`",
    );
    expect(file("tools/get-pet.tool.ts")).not.toMatch(/ToolHandler<[^>]*\bany\b/);
  }, 300_000);

  it("--operations picks operations; a missing --url, an unknown operation and Swagger 2 are errors", async () => {
    const plan = await planGenerate(
      "openapi",
      "more pets",
      { workflow, agent: "vet", url: spec, operations: "listPets" },
      project,
    );
    expect(plan.create.map((f) => f.path)).toEqual([
      "src/zoo/services/more-pets-api.service.ts",
      "src/zoo/tools/list-pets.dto.ts",
      "src/zoo/tools/list-pets.tool.ts",
      "src/zoo/tools/list-pets.tool.test.ts",
    ]);
    await expect(
      planGenerate("openapi", "pets", { workflow, agent: "vet" }, project),
    ).rejects.toThrow(
      new ScaffoldError("gc generate openapi needs --url <OpenAPI document: a file or a URL>"),
    );
    await expect(
      planGenerate(
        "openapi",
        "pets",
        { workflow, agent: "vet", url: spec, operations: "feed" },
        project,
      ),
    ).rejects.toThrow(
      /No operation "feed" in the document — one of: get_pet, delete_pet, list_pets, create_pet/,
    );
    const swagger = join(project, "swagger.json");
    writeFileSync(
      swagger,
      JSON.stringify({ swagger: "2.0", info: { title: "x", version: "1" }, paths: {} }),
    );
    await expect(
      planGenerate("openapi", "pets", { workflow, agent: "vet", url: swagger }, project),
    ).rejects.toThrow(/only OpenAPI 3.x documents are supported/);
  });

  it("the CLI: --dry-run --json writes nothing, a missing --url exits 3, help lists the kind", () => {
    const dry = run(gc, [
      "generate",
      "openapi",
      "shop",
      "--workflow",
      workflow,
      "--agent",
      "vet",
      "--url",
      spec,
      "--dry-run",
      "--json",
    ]);
    expect(dry.ok, dry.out).toBe(true);
    const plan = JSON.parse(dry.out) as { create: { path: string }[] };
    expect(plan.create.map((f) => f.path)).toContain("src/zoo/services/shop-api.service.ts");
    expect(existsSync(join(project, "src/zoo/services/shop-api.service.ts"))).toBe(false);
    const missing = run(gc, [
      "generate",
      "openapi",
      "shop",
      "--workflow",
      workflow,
      "--agent",
      "vet",
    ]);
    expect(missing.status).toBe(3);
    expect(missing.out).toContain("needs --url");
    expect(helpFor("generate")).toMatch(/<workflow\|agent\|router\|tool\|mcp\|rag\|openapi>/);
    expect(helpFor("generate")).toContain("--url <file|url>");
  });
});
