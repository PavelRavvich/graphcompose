import { ComponentError } from "../components/metadata.js";
import type { FlowModel } from "./check-flow.js";
import { isSelf, isReturn, isEnd, labelOf, isOptional, isParallel } from "./flow.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import { SELF_OPTION, type RouteDeclaration } from "./route.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { routerMetaOf, type RouterMeta } from "./router.decorator.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { PromptOptions } from "../components/prompt-options.js";
import { renderPromptVariables } from "../components/prompt-render.js";
import type { PromptInput } from "../components/prompt-input.js";

/** One route as the router's model sees it: the option name and what choosing it means. */
export interface LoadedRoute {
  /** The target node's key (its name — a route never leads to a workflow start), or `SELF_OPTION`. */
  readonly option: string;
  readonly condition: PromptInput;
  readonly optionalBranches?: readonly string[];
}

/** A router with its texts loaded and normalised; routes sorted by option name. */
export interface LoadedRouter {
  readonly name: string;
  readonly description: string;
  readonly model: string;
  readonly maxVisits?: number;
  /** How to choose (the router's prompt). */
  readonly instructions: PromptInput;
  readonly routes: readonly LoadedRoute[];
}

function optionOf(
  model: FlowModel,
  declaration: RouteDeclaration,
): { option: string; optionalBranches: string[] } {
  if (isSelf(declaration.target)) return { option: SELF_OPTION, optionalBranches: [] };
  if (isReturn(declaration.target)) return { option: "Return", optionalBranches: [] };
  if (isEnd(declaration.target)) return { option: "End", optionalBranches: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion
  const getLabel = (t: any): string => model.collected.keyOf(t as any) ?? labelOf(t);

  const optionalBranches: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (t: any) => {
    if (isOptional(t)) {
      optionalBranches.push(getLabel(t.target));
      walk(t.target);
    } else if (isParallel(t)) {
      t.targets.forEach(walk);
    }
  };
  walk(declaration.target);

  return { option: getLabel(declaration.target), optionalBranches };
}

const byOption = (left: LoadedRoute, right: LoadedRoute): number =>
  left.option < right.option ? -1 : left.option > right.option ? 1 : 0;

function loadRouter(model: FlowModel, ref: FlowNodeRef): LoadedRouter {
  const meta = routerMetaOf(ref.use);
  if (meta === undefined) throw new ComponentError(`${ref.label} is not a @Router component`);
  const routes = meta.routes.map((declaration) => ({
    ...optionOf(model, declaration),
    condition: renderPromptVariables(ref.name, declaration, meta.source, undefined),
  }));
  return {
    name: ref.name,
    description: meta.description,
    model: meta.model,
    ...(meta.maxVisits === undefined ? {} : { maxVisits: meta.maxVisits }),
    instructions: renderPromptVariables(ref.name, meta, meta.source, undefined),
    routes: [...routes].sort(byOption),
  };
}

/** Every router of the flow with its texts loaded, by node key. */
 
 
export async function loadRouters(model: FlowModel): Promise<ReadonlyMap<string, LoadedRouter>> {
  const routers = [...model.nodes.values()].filter((ref) => ref.kind === "router");
  const loaded = routers.map((ref) => loadRouter(model, ref));
  return new Map(loaded.map((router) => [router.name, router]));
}
