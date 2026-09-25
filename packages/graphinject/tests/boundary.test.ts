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
});
