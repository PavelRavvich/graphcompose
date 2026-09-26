import { readFileSync } from "node:fs";
import { ScaffoldError } from "./errors.js";
import { namesOf, type Names } from "./names.js";
import { renderTemplate } from "./render.js";
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

const vars = (n: Names): Record<string, string> => ({
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

export function toolFiles(dir: string, tool: Names): FileToWrite[] {
  return [
    {
      path: `${dir}/tools/${tool.kebab}.tool.ts`,
      content: render("tool/tool.ts.tmpl", vars(tool)),
    },
    {
      path: `${dir}/tools/${tool.kebab}.tool.test.ts`,
      content: render("tool/tool.test.ts.tmpl", vars(tool)),
    },
  ];
}

export function agentFiles(
  dir: string,
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
      path: `${dir}/agents/${agent.kebab}.agent.ts`,
      content: render("agent/agent.ts.tmpl", variables).replace(/\n\n\n/g, "\n\n"),
    },
    {
      path: `${dir}/agents/${agent.kebab}.prompt.md`,
      content: render("agent/agent.prompt.md.tmpl", variables),
    },
  ];
}

export function mcpFile(
  dir: string,
  mcp: Exclude<McpSpec, { kind: "none" }>,
): { file: FileToWrite; server: string; facade: string } {
  const n = namesOf(mcp.name);
  if (mcp.kind === "filesystem") {
    const content = render("mcp/filesystem.ts.tmpl", { ...vars(n), dir: mcp.dir });
    return {
      file: { path: `${dir}/mcp/${n.kebab}.mcp.ts`, content },
      server: `${n.pascal}Server`,
      facade: `Read${n.pascal}File`,
    };
  }
  const tool = namesOf(mcp.tool);
  const content = render("mcp/command.ts.tmpl", {
    ...vars(n),
    command: mcp.command,
    tool: tool.snake,
    toolPascal: tool.pascal,
  });
  return {
    file: { path: `${dir}/mcp/${n.kebab}.mcp.ts`, content },
    server: `${n.pascal}Server`,
    facade: `${tool.pascal}${n.pascal}`,
  };
}

export function ragFiles(
  dir: string,
  workflow: Names,
  rag: { name: string; folder: string },
): { files: FileToWrite[]; knowledge: string } {
  const n = namesOf(rag.name);
  const variables = { ...vars(n), folder: rag.folder, workflow: workflow.kebab };
  return {
    files: [
      { path: `${dir}/rag/${n.kebab}.rag.ts`, content: render("rag/knowledge.ts.tmpl", variables) },
      { path: `${rag.folder}/README.md`, content: render("rag/note.md.tmpl", variables) },
    ],
    knowledge: `${n.pascal}Knowledge`,
  };
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
    const mcp = mcpFile(dir, spec.mcp);
    files.push(mcp.file);
    server = mcp.server;
    agent = wire(
      agent,
      "Agent",
      "tools",
      mcp.facade,
      mcp.facade,
      `../mcp/${namesOf(spec.mcp.name).kebab}.mcp.js`,
    );
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
    agentFiles(dir, a.names, a.spec.description, a.tools),
  );
  if (firstAgent === undefined) throw new ScaffoldError("A workflow needs at least one agent");
  const more = extras(spec, dir, firstAgent);
  const imports = [
    ...agents.map(
      (a) => `import { ${a.names.pascal}Agent } from "./agents/${a.names.kebab}.agent.js";`,
    ),
    ...(spec.mcp.kind === "none"
      ? []
      : [`import { ${more.server} } from "./mcp/${namesOf(spec.mcp.name).kebab}.mcp.js";`]),
  ].join("\n");
  const module = render("workflow/workflow.ts.tmpl", {
    ...vars(workflow),
    imports,
    agents: agents.map((a) => `${a.names.pascal}Agent`).join(", "),
    servers: more.server,
  });
  return [
    { path: `${dir}/models.ts`, content: render("workflow/models.ts.tmpl", {}) },
    ...agents.flatMap((a) => a.tools.flatMap((t) => toolFiles(dir, t))),
    ...more.files,
    more.agent,
    ...otherAgentFiles,
    { path: `${dir}/${workflow.kebab}.workflow.ts`, content: module },
  ];
}
