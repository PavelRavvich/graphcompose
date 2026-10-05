import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ComponentError } from "../components/metadata.js";
import type { FlowModel } from "./check-flow.js";
import { isSelf, isSkip, labelOf } from "./flow.js";
import type { FlowNodeRef } from "./flow-nodes.js";
import { SELF_OPTION, type PromptSource, type RouteDeclaration } from "./route.js";
import { routerMetaOf, type RouterMeta } from "./router.decorator.js";
import { joinPromptParts } from "./text.js";

/** One route as the router's model sees it: the option name and what choosing it means. */
export interface LoadedRoute {
  /** The target node's key (its name — a route never leads to a workflow start), or `SELF_OPTION`. */
  readonly option: string;
  readonly text: string;
}

/** A router with its texts loaded and normalised; routes sorted by option name. */
export interface LoadedRouter {
  readonly name: string;
  readonly description: string;
  readonly model: string;
  readonly maxVisits?: number;
  /** How to choose (the router's prompt). */
  readonly instructions: string;
  readonly routes: readonly LoadedRoute[];
}

async function readPart(meta: RouterMeta, url: string): Promise<string> {
  const path = resolve(meta.source === undefined ? process.cwd() : dirname(meta.source), url);
  return readFile(path, "utf8").catch(() => {
    throw new ComponentError(`@Router "${meta.name}": prompt file not found: ${path}`);
  });
}

/** `prompt` first, then `promptUrls` in order, joined with one blank line, normalised. */
async function textOf(meta: RouterMeta, source: string | PromptSource): Promise<string> {
  if (typeof source === "string") return joinPromptParts([source]);
  const files = await Promise.all((source.promptUrls ?? []).map((url) => readPart(meta, url)));
  return joinPromptParts([source.prompt ?? "", ...files]);
}

function optionOf(model: FlowModel, declaration: RouteDeclaration): string {
  return isSelf(declaration.target)
    ? SELF_OPTION
    : (model.collected.keyOf(declaration.target as any) ?? labelOf(declaration.target as any));
}

const byOption = (left: LoadedRoute, right: LoadedRoute): number =>
  left.option < right.option ? -1 : left.option > right.option ? 1 : 0;

async function loadRouter(model: FlowModel, ref: FlowNodeRef): Promise<LoadedRouter> {
  const meta = routerMetaOf(ref.use);
  if (meta === undefined) throw new ComponentError(`${ref.label} is not a @Router component`);
  const routes = await Promise.all(
    meta.routes.map(async (declaration) => ({
      option: optionOf(model, declaration),
      text: await textOf(meta, declaration.text),
    })),
  );
  return {
    name: ref.name,
    description: meta.description,
    model: meta.model,
    ...(meta.maxVisits === undefined ? {} : { maxVisits: meta.maxVisits }),
    instructions: await textOf(meta, meta),
    routes: [...routes].sort(byOption),
  };
}

/** Every router of the flow with its texts loaded, by node key. */
export async function loadRouters(model: FlowModel): Promise<ReadonlyMap<string, LoadedRouter>> {
  const routers = [...model.nodes.values()].filter((ref) => ref.kind === "router");
  const loaded = await Promise.all(routers.map((ref) => loadRouter(model, ref)));
  return new Map(loaded.map((router) => [router.name, router]));
}
