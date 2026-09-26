import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ScaffoldError } from "./errors.js";
import { namesOf } from "./names.js";
import { agentFiles, mcpFile, planWorkflow, ragFiles, toolFiles } from "./plan.js";
import { wire } from "./wire.js";
import { FILESYSTEM_SERVER_PACKAGE, filesystemServerVersion, workflowScripts } from "./project.js";
import type { Changes, FileToWrite } from "./write.js";

export const KINDS = ["workflow", "agent", "tool", "mcp", "rag"] as const;
export type Kind = (typeof KINDS)[number];

export interface GenerateOptions {
  readonly workflow?: string | undefined;
  readonly agent?: string | undefined;
  readonly description?: string | undefined;
  readonly dir?: string | undefined;
  readonly command?: string | undefined;
  readonly tool?: string | undefined;
  readonly folder?: string | undefined;
}

const need = (value: string | undefined, flag: string, kind: Kind): string => {
  if (value === undefined || value === "")
    throw new ScaffoldError(`gc generate ${kind} needs ${flag}`);
  return value;
};

const read = (root: string, path: string): FileToWrite => {
  try {
    return { path, content: readFileSync(join(root, path), "utf8") };
  } catch {
    throw new ScaffoldError(`Not found: ${path}`);
  }
};

/** The workflow a part goes into: its folder and module file (`--workflow src/x/x.workflow.ts`). */
function workflowOf(root: string, path: string, kind: Kind): { dir: string; module: FileToWrite } {
  const file = need(path, "--workflow <path>", kind).replace(/^\.\//, "");
  if (!basename(file).endsWith(".workflow.ts"))
    throw new ScaffoldError(`--workflow must be a *.workflow.ts file: ${file}`);
  return { dir: dirname(file), module: read(root, file) };
}

const agentFile = (root: string, dir: string, agent: string): FileToWrite =>
  read(root, `${dir}/agents/${namesOf(agent).kebab}.agent.ts`);

function withScripts(
  root: string,
  scripts: Record<string, string>,
  dependency?: readonly [string, string],
): FileToWrite {
  const pkg = JSON.parse(read(root, "package.json").content) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
  };
  const clash = Object.keys(scripts).filter((k) => pkg.scripts?.[k] !== undefined);
  if (clash.length > 0)
    throw new ScaffoldError(`package.json already has scripts: ${clash.join(", ")}`);
  const deps =
    dependency === undefined
      ? pkg.dependencies
      : {
          ...pkg.dependencies,
          [dependency[0]]: pkg.dependencies?.[dependency[0]] ?? dependency[1],
        };
  return {
    path: "package.json",
    content: `${JSON.stringify({ ...pkg, scripts: { ...pkg.scripts, ...scripts }, dependencies: deps }, null, 2)}\n`,
  };
}

const PLANS: Readonly<Record<Kind, (root: string, name: string, o: GenerateOptions) => Changes>> = {
  workflow: (root, name) => {
    const n = namesOf(name);
    const spec = {
      name,
      agents: [{ name: "assistant", description: `Helps with ${n.title}`, tools: [] }],
      mcp: { kind: "none" } as const,
    };
    return {
      create: planWorkflow(spec),
      modify: [withScripts(root, workflowScripts(n, `:${n.kebab}`))],
    };
  },
  agent: (root, name, o) => {
    const { dir, module } = workflowOf(root, o.workflow ?? "", "agent");
    const n = namesOf(name);
    return {
      create: agentFiles(dir, n, o.description ?? `${n.title} (TODO: describe the role)`, []),
      modify: [
        wire(
          module,
          "Workflow",
          "agents",
          `${n.pascal}Agent`,
          `${n.pascal}Agent`,
          `./agents/${n.kebab}.agent.js`,
        ),
      ],
    };
  },
  tool: (root, name, o) => {
    const { dir } = workflowOf(root, o.workflow ?? "", "tool");
    const n = namesOf(name);
    const agent = agentFile(root, dir, need(o.agent, "--agent <name>", "tool"));
    return {
      create: toolFiles(dir, n),
      modify: [
        wire(
          agent,
          "Agent",
          "tools",
          `${n.pascal}Tool`,
          `${n.pascal}Tool`,
          `../tools/${n.kebab}.tool.js`,
        ),
      ],
    };
  },
  mcp: (root, name, o) => {
    const { dir, module } = workflowOf(root, o.workflow ?? "", "mcp");
    const spec =
      o.dir !== undefined
        ? { kind: "filesystem" as const, name, dir: o.dir }
        : {
            kind: "command" as const,
            name,
            command: need(o.command, "--dir <folder> or --command <cmd>", "mcp"),
            tool: need(o.tool, "--tool <name>", "mcp"),
          };
    const mcp = mcpFile(dir, spec);
    const from = `./mcp/${namesOf(name).kebab}.mcp.js`;
    const modify = [wire(module, "Workflow", "mcp", mcp.server, mcp.server, from)];
    if (o.agent !== undefined)
      modify.push(
        wire(agentFile(root, dir, o.agent), "Agent", "tools", mcp.facade, mcp.facade, `.${from}`),
      );
    if (spec.kind === "filesystem")
      modify.push(withScripts(root, {}, [FILESYSTEM_SERVER_PACKAGE, filesystemServerVersion()]));
    return { create: [mcp.file], modify };
  },
  rag: (root, name, o) => {
    const { dir } = workflowOf(root, o.workflow ?? "", "rag");
    const workflow = namesOf(basename(dir));
    const rag = ragFiles(dir, workflow, { name, folder: need(o.folder, "--folder <dir>", "rag") });
    const from = `../rag/${namesOf(name).kebab}.rag.js`;
    const modify =
      o.agent === undefined
        ? []
        : [
            wire(
              agentFile(root, dir, o.agent),
              "Agent",
              "rag",
              `{ use: ${rag.knowledge}, mode: "tool" }`,
              rag.knowledge,
              from,
            ),
          ];
    return { create: rag.files, modify };
  },
};

/** `gc generate <kind> <name>`: what to create and which existing files to rewire. */
export function planGenerate(
  kind: string,
  name: string,
  options: GenerateOptions,
  root: string,
): Changes {
  if (!(KINDS as readonly string[]).includes(kind))
    throw new ScaffoldError(`Unknown kind "${kind}" — one of: ${KINDS.join(", ")}`);
  return PLANS[kind as Kind](root, name, options);
}
