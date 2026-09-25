import { readFileSync } from "node:fs";
import { namesOf, type Names } from "./names.js";
import { planWorkflow, render, workflowDir, type WorkflowSpec } from "./plan.js";
import type { FileToWrite } from "./write.js";

interface PackageJson {
  readonly version: string;
  readonly dependencies: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

/** This framework's own package.json: the versions a generated project depends on. */
const framework = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as PackageJson;

export const FILESYSTEM_SERVER_PACKAGE = "@modelcontextprotocol/server-filesystem";
export const filesystemServerVersion = (): string =>
  framework.devDependencies?.[FILESYSTEM_SERVER_PACKAGE] ?? "latest";

/** The npm scripts of one workflow; a suffix (`:name`) for every workflow after the first. */
export function workflowScripts(workflow: Names, suffix = ""): Record<string, string> {
  const path = `${workflowDir(workflow)}/${workflow.kebab}.workflow.ts`;
  return Object.fromEntries(
    ["chat", "run", "describe", "rag:index"].map((command) => [
      `${command}${suffix}`,
      `graphcompose ${command} --workflow ${path}`,
    ]),
  );
}

/** `gc create`: a standalone project with its first workflow. */
export function planProject(spec: WorkflowSpec): FileToWrite[] {
  const project = namesOf(spec.name);
  const scripts = Object.entries(workflowScripts(project))
    .map(([k, v]) => `    "${k}": "${v}",`)
    .join("\n");
  const dependencies = {
    graphcompose: `^${framework.version}`,
    zod: framework.dependencies.zod ?? "latest",
    ...(spec.mcp.kind === "filesystem"
      ? { [FILESYSTEM_SERVER_PACKAGE]: filesystemServerVersion() }
      : {}),
  };
  const variables = {
    kebab: project.kebab,
    title: project.title,
    scripts,
    dependencies: Object.entries(dependencies)
      .map(([k, v]) => `    "${k}": "${v}"`)
      .join(",\n"),
    typescriptVersion: framework.dependencies.typescript ?? "latest",
  };
  return [
    { path: "package.json", content: render("project/package.json.tmpl", variables) },
    { path: "tsconfig.json", content: render("project/tsconfig.json.tmpl", {}) },
    { path: "vitest.config.ts", content: render("project/vitest.config.ts.tmpl", {}) },
    { path: ".env.example", content: render("project/env.example.tmpl", {}) },
    { path: ".gitignore", content: render("project/gitignore.tmpl", {}) },
    { path: "README.md", content: render("project/README.md.tmpl", variables) },
    ...planWorkflow(spec),
  ];
}
