import { renderTemplate } from "graphcompose/internal";
import { readFileSync } from "node:fs";
import { ScaffoldError, ScaffoldUsageError } from "./errors.js";
import { namesOf, type Names } from "./names.js";
import { mcpFiles, ragFiles } from "./parts.js";
import { agentRoute, endpointFiles, finishRoute, MAIN_ROUTER, routerFile } from "./flow-files.js";
import { wire } from "./wire.js";
import type { FileToWrite } from "./write.js";

const TEMPLATES = new URL("../../templates/", import.meta.url);

/** A template of the package rendered with `variables`; an unknown variable is a bug in the template. */
export const render = (path: string, variables: Readonly<Record<string, string>>): string =>
  renderTemplate(
    readFileSync(new URL(path, TEMPLATES), "utf8"),
    variables,
    (key) => new ScaffoldError(`template ${path}: unknown variable {{${key}}}`),
  );

export const vars = (n: Names): Record<string, string> => ({
  kebab: n.kebab,
  snake: n.snake,
  pascal: n.pascal,
  title: n.title,
});

export interface AgentSpec {
  readonly name: string;
  readonly description: string;
  readonly tools: readonly string[];
}
export type McpSpec =
  | { readonly kind: "none" }
  | { readonly kind: "filesystem"; readonly name: string; readonly dir: string }
  | {
      readonly kind: "command";
      readonly name: string;
      readonly command: string;
      readonly tool: string;
    };
export interface WorkflowSpec {
  readonly name: string;
  readonly agents: readonly AgentSpec[];
  readonly mcp: McpSpec;
  readonly rag?: { readonly name: string; readonly folder: string } | undefined;
}

/** Where a workflow's files live: `src/<workflow>/`. */
export const workflowDir = (workflow: Names): string => `src/${workflow.kebab}`;

/** A tool and its test in `folder` (`<workflow>/tools`). */
export function toolFiles(folder: string, tool: Names): FileToWrite[] {
  return [
    {
      path: `${folder}/${tool.kebab}.tool.ts`,
      content: render("tool/tool.ts.tmpl", vars(tool)),
    },
    {
      path: `${folder}/${tool.kebab}.tool.test.ts`,
      content: render("tool/tool.test.ts.tmpl", vars(tool)),
    },
  ];
}

/** An agent and its prompt in `folder` (`<workflow>/agents`), its tools in `../tools`. */
export function agentFiles(
  folder: string,
  agent: Names,
  description: string,
  tools: readonly Names[],
): FileToWrite[] {
  const imports = tools
    .map((t) => `import { ${t.pascal}Tool } from "../tools/${t.kebab}.tool.js";`)
    .join("\n");
  const variables = {
    ...vars(agent),
    description: description.replace(/"/g, "'"),
    imports,
    tools: tools.map((t) => `${t.pascal}Tool`).join(", "),
  };
  return [
    {
      path: `${folder}/${agent.kebab}.agent.ts`,
      content: render("agent/agent.ts.tmpl", variables).replace(/\n\n\n/g, "\n\n"),
    },
    {
      path: `${folder}/${agent.kebab}.prompt.md`,
      content: render("agent/agent.prompt.md.tmpl", variables),
    },
  ];
}

/** MCP server and knowledge base of a new workflow — both wired into its first agent. */
function extras(
  spec: WorkflowSpec,
  dir: string,
  firstAgent: FileToWrite,
): { files: FileToWrite[]; agent: FileToWrite; server: string } {
  const workflow = namesOf(spec.name);
  const files: FileToWrite[] = [];
  let agent = firstAgent;
  let server = "";
  if (spec.mcp.kind !== "none") {
    const mcp = mcpFiles(dir, spec.mcp);
    files.push(...mcp.files);
    server = mcp.server;
    agent = wire(agent, "Agent", "tools", mcp.tool, mcp.tool, `../${mcp.toolModule}.js`);
  }

  if (spec.rag !== undefined) {
    const rag = ragFiles(dir, workflow, spec.rag);
    files.push(...rag.files);
    agent = wire(
      agent,
      "Agent",
      "rag",
      `{ use: ${rag.knowledge}, mode: "tool" }`,
      rag.knowledge,
      `../rag/${namesOf(spec.rag.name).kebab}.rag.js`,
    );
  }
  return { files, agent, server };
}

/** Every file of one new workflow (agents, tools with tests, MCP, knowledge base, the module). */
export function planWorkflow(spec: WorkflowSpec): FileToWrite[] {
  const workflow = namesOf(spec.name);
  const dir = workflowDir(workflow);
  const agents = spec.agents.map((a) => ({
    spec: a,
    names: namesOf(a.name),
    tools: a.tools.map(namesOf),
  }));
  const [firstAgent, ...otherAgentFiles] = agents.flatMap((a) =>
    agentFiles(`${dir}/agents`, a.names, a.spec.description, a.tools),
  );
  if (firstAgent === undefined) throw new ScaffoldUsageError("A workflow needs at least one agent");
  const more = extras(spec, dir, firstAgent);
  const imports = [
    ...agents.map(
      (a) => `import { ${a.names.pascal}Agent } from "./agents/${a.names.kebab}.agent.js";`,
    ),
    ...(spec.mcp.kind === "none"
      ? []
      : [`import { ${more.server} } from "./mcp/${namesOf(spec.mcp.name).kebab}.server.js";`]),
  ].join("\n");
  const module = render("workflow/workflow.ts.tmpl", {
    ...vars(workflow),
    imports,
    agents: agents.map((a) => `${a.names.pascal}Agent`).join(", "),
    servers: more.server,
  });
  const router = routerFile(`${dir}/routers`, namesOf("main"), MAIN_ROUTER, [
    ...agents.map((a) => agentRoute(a.names, a.spec.description)),
    finishRoute("TextWorkflowFinish", "../workflow-finishes/text.workflow-finish.js"),
  ]);
  return [
    { path: `${dir}/models.ts`, content: render("workflow/models.ts.tmpl", {}) },
    {
      path: `${dir}/model-providers/openrouter.model-provider.ts`,
      content: render("workflow/openrouter.model-provider.ts.tmpl", {}),
    },
    ...endpointFiles(dir),
    router,
    ...agents.flatMap((a) => a.tools.flatMap((t) => toolFiles(`${dir}/tools`, t))),
    ...more.files,
    more.agent,
    ...otherAgentFiles,
    { path: `${dir}/${workflow.kebab}.workflow.ts`, content: module },
  ];
}
