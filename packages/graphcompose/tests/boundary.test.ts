import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { USAGE } from "../src/cli/usage.js";
import * as publicApi from "../src/index.js";

const root = new URL("../../..", import.meta.url).pathname;
const framework = new URL("../src", import.meta.url).pathname;
const sources = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join(dir, file));

describe("framework and examples apart (#91)", () => {
  it("AC1: the framework never imports example code", () => {
    const offenders = sources(framework).filter((file) =>
      /from "[^"]*examples\//.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("AC4: the only example is job-scout; the framework ships no workflow of its own", () => {
    const decorated = (file: string): boolean => /^@Workflow\(/m.test(readFileSync(file, "utf8"));

    expect(readdirSync(join(root, "examples"))).toEqual(["job-scout"]);
    expect(sources(framework).filter(decorated)).toEqual([]);
  });

  it("AC5: the public API and the command help say workflow, not bundle", () => {
    expect(Object.keys(publicApi).filter((name) => /bundle/i.test(name))).toEqual([]);
    expect(Object.keys(publicApi)).toEqual(
      expect.arrayContaining(["Workflow", "workflowOf", "createAppDeps", "loadWorkflow"]),
    );
    expect(USAGE).not.toMatch(/bundle/i);
    expect(USAGE).toContain("--workflow");
  });
  it("AC1 (#101): the package is graphcompose; the command is graphcompose, short gc", () => {
    const pkg = JSON.parse(
      readFileSync(join(root, "packages/graphcompose/package.json"), "utf8"),
    ) as {
      name: string;
      bin: Record<string, string>;
    };

    expect(pkg.name).toBe("graphcompose");
    expect(pkg.bin).toEqual({ graphcompose: "./bin/graphcompose.js", gc: "./bin/graphcompose.js" });
    expect(USAGE).toContain("GraphCompose");
  });

  it("AC4 (#101): no graphInject / graphinject left in the repository's code, commands or docs", () => {
    const skip =
      /(^|\/)(node_modules|\.git|dist|coverage|\.langgraph_api|\.idea)(\/|$)|(^|\/)(\.env|package-lock\.json)$/;
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
      (file) => !skip.test(file) && /\.(ts|js|cjs|mjs|json|md|ya?ml|sh)$|Makefile$/.test(file),
    );
    const self = "packages/graphcompose/tests/boundary.test.ts"; // names the old name on purpose
    const left = files.filter(
      (file) => file !== self && /graphinject/i.test(readFileSync(join(root, file), "utf8")),
    );

    expect(left).toEqual([]);
  });
});
