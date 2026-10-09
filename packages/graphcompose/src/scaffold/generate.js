import { basename } from "node:path";
import { ScaffoldError } from "./errors.js";
import { namesOf } from "./names.js";
import { mcpFiles, ragFiles } from "./parts.js";
import { planWorkflow, toolFiles } from "./plan.js";
import { planAgent, planRouter } from "./generate-flow.js";
import { agentFile, need, read, targetWorkflow } from "./project-files.js";
import { wire } from "./wire.js";
import { FILESYSTEM_SERVER_PACKAGE, filesystemServerVersion, workflowScripts } from "./project.js";
export const KINDS = ["workflow", "agent", "router", "tool", "mcp", "rag"];
function withScripts(root, scripts, dependency) {
  const pkg = JSON.parse(read(root, "package.json").content);
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
const PLANS = {
  workflow: (root, name) => {
    const n = namesOf(name);
    const spec = {
      name,
      agents: [{ name: "assistant", description: `Helps with ${n.title}`, tools: [] }],
      mcp: { kind: "none" },
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
        ? { kind: "filesystem", name, dir: o.dir }
        : {
            kind: "command",
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
};
/** `gc generate <kind> <name>`: what to create and which existing files to rewire. */
export function planGenerate(kind, name, options, root) {
  if (!KINDS.includes(kind))
    throw new ScaffoldError(`Unknown kind "${kind}" — one of: ${KINDS.join(", ")}`);
  return PLANS[kind](root, name, options);
}
