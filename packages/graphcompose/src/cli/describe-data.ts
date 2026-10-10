import { flowLines } from "../graph/flow-text.js";
import { configSnapshot } from "../run/versions.js";
import { shortVersion, versionOf } from "../terns/index.js";
import { isMcpFacade } from "../tools/index.js";
import { resolveTools, type AssembledWorkflow } from "../workflow.js";
import { describeServices } from "./describe.js";

/** `gc describe --json`: the workflow at a glance, as data (the same facts as the text). */
export function describeData(bundle: AssembledWorkflow, profile = "base"): Record<string, unknown> {
  const c = bundle.config;
  const tools = resolveTools(bundle, describeServices).map((tool) => ({
    name: tool.name,
    description: tool.description,
    kind: isMcpFacade(tool) ? "mcp" : "local",
    ...(isMcpFacade(tool) ? { server: tool.mcp.server } : {}),
    ...(tool.channel === undefined ? {} : { channel: tool.channel }),
  }));
  const assigned = new Set(Object.values(c.agents).flatMap((agent) => agent.tools ?? []));
  return {
    name: c.name,
    version: c.version,
    profile,
    config: shortVersion(versionOf(configSnapshot(bundle))),
    flow: flowLines(bundle.flow),
    routers: bundle.routers.map((router) => ({
      name: router.name,
      model: router.model,
      description: router.description,
      ...(router.maxVisits === undefined ? {} : { maxVisits: router.maxVisits }),
    })),
    agents: Object.entries(c.agents).map(([name, agent]) => ({
      name,
      model: agent.model,
      description: agent.description,
      tools: agent.tools ?? [],
      rag: (agent.rag ?? []).map((kb) => kb.name),
    })),
    tools,
    unassignedTools: tools.map((tool) => tool.name).filter((name) => !assigned.has(name)),
    limits: bundle.limits,
  };
}
