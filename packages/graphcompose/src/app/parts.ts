import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { AssembledWorkflow, WorkflowServices } from "../workflow.js";
import type { KnowledgeSource } from "../rag/types.js";
import type { AgentsConfigOf } from "../config/types.js";
import { chatModelSettingsOf, flowRouterFactory } from "../graph/router-model.js";
import type { EvalDeps } from "../eval/eval.js";
import type { RunDeps } from "../run/types.js";
import type { ModelGateway } from "../llm/gateway.js";
import { buildGuards, type GuardSet } from "../guards/index.js";
import { guardPrompts } from "../prompts/guards.js";
import { createRouter, type Router } from "../routers/index.js";
import type { AnyTool } from "../tools/index.js";
import type { PauseSeam } from "../pause/index.js";
import type { ContainerOptions } from "../components/container.js";

export class UnknownToolError extends Error {
  override name = "UnknownToolError";
}

/** Tool lookup for the graph; an unknown name is a wiring bug. */
export const toolLookup = (tools: readonly AnyTool[]): ((name: string) => AnyTool) => {
  const byName = new Map(tools.map((tool) => [tool.name, tool] as const));
  return (name) => {
    const tool = byName.get(name);
    if (tool === undefined) throw new UnknownToolError(`Unknown tool "${name}"`);
    return tool;
  };
};

/** Eval / replay: a Jev judge, spend on `<workflow>:eval` — its own day, capped like the workflow's. */
export const evaluationFor = (
  bundle: AssembledWorkflow,
  stores: Pick<EvalDeps, "terns" | "ledger">,
  gateway: ModelGateway,
): EvalDeps => ({
  ...stores,
  judge: createRouter("judge", bundle.config.defaults.router, bundle.config.defaults.chat, gateway),
  account: {
    key: `${bundle.config.name}:eval`,
    dailyCap: bundle.limits.perDay?.cost ?? Number.POSITIVE_INFINITY,
  },
});

/** Core services for the workflow's components; one object, so tools and knowledge share instances. */
export const servicesFor = (
  bundle: AssembledWorkflow,
  gateway: ModelGateway,
  env: NodeJS.ProcessEnv,
  container: ContainerOptions,
): WorkflowServices => ({
  router: (name) =>
    createRouter(name, bundle.config.defaults.router, bundle.config.defaults.chat, gateway),
  env,
  container,
});

/** Context-mode knowledge bases per agent, when the workflow has any. */
export function knowledgeFor(
  bundle: AssembledWorkflow,
  services: WorkflowServices,
): { readonly knowledge?: (agent: string) => readonly KnowledgeSource[] } {
  const byAgent = bundle.knowledge?.(services);
  return byAgent === undefined ? {} : { knowledge: (agent) => byAgent.get(agent) ?? [] };
}

/** The pause seam, when the workflow has tools that wait for a human; on the app's checkpointer. */
export const pauseFor = (
  bundle: AssembledWorkflow,
  checkpointer: BaseCheckpointSaver,
): PauseSeam | undefined =>
  bundle.needsApproval === undefined
    ? undefined
    : { checkpointer, needsApproval: bundle.needsApproval };

/** One quality judge per agent with `reasoning` (Jev unless reasoning sets a model). */
export const judgesFor = (
  config: AgentsConfigOf<string>,
  gateway: ModelGateway,
): ReadonlyMap<string, Router> =>
  new Map(
    Object.entries(config.agents).flatMap(([name, agent]) =>
      agent.reasoning === undefined
        ? []
        : [
            [
              name,
              createRouter(
                `quality:${name}`,
                agent.reasoning.model ?? config.defaults.router,
                config.defaults.chat,
                gateway,
              ),
            ] as const,
          ],
    ),
  );

/** Guards from config + their texts; each guard is a router (Jev unless it sets a model). */
export const guardsFor = (config: AgentsConfigOf<string>, gateway: ModelGateway): GuardSet =>
  buildGuards(config.guards, guardPrompts, (name, model) =>
    createRouter(`guard:${name}`, model ?? config.defaults.router, config.defaults.chat, gateway),
  );

/** The workflow's flow, limits and routers; each router decides on its own model. */
export const flowFor = (
  bundle: AssembledWorkflow,
  config: AgentsConfigOf<string>,
  gateway: ModelGateway,
): Pick<RunDeps<string>, "flow" | "limits" | "routers" | "routerFor"> => ({
  flow: bundle.flow,
  limits: bundle.limits,
  routers: bundle.routers,
  routerFor: flowRouterFactory({
    gateway,
    chatDefaults: config.defaults.chat,
    chatModelSettings: chatModelSettingsOf(config),
  }),
});
