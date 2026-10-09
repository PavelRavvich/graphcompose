import { readFileSync } from "node:fs";
import { ScaffoldError } from "./errors.js";
import { namesOf } from "./names.js";
import { planWorkflow, render, vars, workflowDir } from "./plan.js";
/** This framework's own package.json: the versions a generated project depends on. */
const framework = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
export const FILESYSTEM_SERVER_PACKAGE = "@modelcontextprotocol/server-filesystem";
export const filesystemServerVersion = () =>
  framework.devDependencies?.[FILESYSTEM_SERVER_PACKAGE] ?? "latest";
/** The npm scripts of one workflow; a suffix (`:name`) for every workflow after the first. */
export function workflowScripts(workflow, suffix = "") {
  const path = `${workflowDir(workflow)}/${workflow.kebab}.workflow.ts`;
  return Object.fromEntries(
    ["chat", "run", "describe", "rag:index"].map((command) => [
      `${command}${suffix}`,
      `graphcompose ${command} --workflow ${path}`,
    ]),
  );
}
/** The first workflow's test on `graphcompose/testing`: its first agent, by script. */
function workflowTest(spec) {
  const workflow = namesOf(spec.name);
  const [first] = spec.agents;
  if (first === undefined) throw new ScaffoldError("A workflow needs at least one agent");
  const agent = namesOf(first.name);
  return {
    path: `${workflowDir(workflow)}/${workflow.kebab}.workflow.test.ts`,
    content: render("project/workflow.test.ts.tmpl", {
      ...vars(workflow),
      agent: agent.pascal,
      agentKebab: agent.kebab,
    }),
  };
}
/** `gc create`: a standalone project with its first workflow and its test. */
export function planProject(spec) {
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
    { path: "src/environments/environment.ts", content: render("project/environment.ts.tmpl", {}) },
    {
      path: "src/environments/environment.staging.ts",
      content: render("project/environment.staging.ts.tmpl", {}),
    },
    ...planWorkflow(spec),
    workflowTest(spec),
  ];
}
