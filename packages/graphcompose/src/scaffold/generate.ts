import { basename } from "node:path";
import { ScaffoldError } from "./errors.js";
import { namesOf } from "./names.js";
import { mcpFiles, ragFiles } from "./parts.js";
import { planWorkflow, toolFiles } from "./plan.js";
import { planAgent, planRouter } from "./generate-flow.js";
import { agentFile, need, read, targetWorkflow } from "./project-files.js";
import { planOpenApi } from "./openapi.js";
import { wire } from "./wire.js";
import { FILESYSTEM_SERVER_PACKAGE, filesystemServerVersion, workflowScripts } from "./project.js";
import type { Changes, FileToWrite } from "./write.js";

export const KINDS = ["workflow", "agent", "router", "tool", "mcp", "rag", "openapi"] as const;
export type Kind = (typeof KINDS)[number];

export interface GenerateOptions {
  readonly workflow?: string | undefined;
  readonly agent?: string | undefined;
  readonly description?: string | undefined;
  readonly dir?: string | undefined;
  readonly command?: string | undefined;
  readonly tool?: string | undefined;
  readonly folder?: string | undefined;
  readonly url?: string | undefined;
  readonly operations?: string | undefined;
}

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

const PLANS: Readonly<
  Record<Kind, (root: string, name: string, o: GenerateOptions) => Changes | Promise<Changes>>
> = {
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
  agent: planAgent,
  router: planRouter,
  tool: (root, name, o) => {
    const { dir } = targetWorkflow(root, o.workflow ?? "", "tool");
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
    const { dir, module } = targetWorkflow(root, o.workflow ?? "", "mcp");
    const spec =
      o.dir !== undefined
        ? { kind: "filesystem" as const, name, dir: o.dir }
        : {
            kind: "command" as const,
            name,
            command: need(o.command, "--dir <folder> or --command <cmd>", "mcp"),
            tool: need(o.tool, "--tool <name>", "mcp"),
          };
    const mcp = mcpFiles(dir, spec);
    const modify = [
      wire(module, "Workflow", "mcp", mcp.server, mcp.server, `./${mcp.serverModule}.js`),
    ];
    if (o.agent !== undefined) {
      modify.push(
        wire(
          agentFile(root, dir, o.agent),
          "Agent",
          "tools",
          mcp.tool,
          mcp.tool,
          `../${mcp.toolModule}.js`,
        ),
      );
    }
    if (spec.kind === "filesystem") {
      modify.push(withScripts(root, {}, [FILESYSTEM_SERVER_PACKAGE, filesystemServerVersion()]));
    }
    return { create: mcp.files, modify };
  },
  rag: (root, name, o) => {
    const { dir } = targetWorkflow(root, o.workflow ?? "", "rag");
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
  openapi: (root, name, o) => planOpenApi(root, name, o),
};

/** `gc generate <kind> <name>`: what to create and which existing files to rewire. */
export async function planGenerate(
  kind: string,
  name: string,
  options: GenerateOptions,
  root: string,
): Promise<Changes> {
  if (!(KINDS as readonly string[]).includes(kind))
    throw new ScaffoldError(`Unknown kind "${kind}" — one of: ${KINDS.join(", ")}`);
  return PLANS[kind as Kind](root, name, options);
}
