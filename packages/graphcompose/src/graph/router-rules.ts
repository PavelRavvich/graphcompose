import { isSelf, labelOf } from "./flow.js";
import type { CollectedFlow, FlowNodeRef, NextDeclaration } from "./flow-nodes.js";
import type { PromptSource, RouteDeclaration } from "./route.js";
import { routerMetaOf, type RouterMeta } from "./router.decorator.js";
import { violation, type RuleViolation } from "./rule-error.js";
import { targetsOf } from "./rules.js";

const SELF_LABEL = "Self";

const hasText = (source: PromptSource): boolean =>
  (source.prompt ?? "").trim() !== "" || (source.promptUrls ?? []).length > 0;

const routeHasText = (declaration: RouteDeclaration): boolean =>
  typeof declaration.text === "string" ? declaration.text.trim() !== "" : hasText(declaration.text);

function textRules(router: FlowNodeRef, meta: RouterMeta): RuleViolation[] {
  const found: RuleViolation[] = [];
  if (!hasText(meta)) {
    const message = `router ${router.label} has no prompt — give \`prompt\` and / or \`promptUrls\``;
    found.push(violation("router.no-prompt", message, [router.label]));
  }
  for (const declaration of meta.routes.filter((item) => !routeHasText(item))) {
    const message = `router ${router.label}: the route to ${labelOf(declaration.target)} has no text`;
    found.push(violation("router.empty-route-text", message, [router.label]));
  }
  return found;
}

/** A route's key: the target node's name, `Self`, or the class label when it is not in the flow. */
function routeKey(flow: CollectedFlow, declaration: RouteDeclaration): string {
  if (isSelf(declaration.target)) return SELF_LABEL;
  return flow.nameOf(declaration.target) ?? labelOf(declaration.target);
}

function chooseKeys(next: NextDeclaration | undefined): string[] {
  if (next?.kind !== "choose") return [];
  return [...next.targets, ...(next.self ? [SELF_LABEL] : [])];
}

const chooseOf = (flow: CollectedFlow, router: string): NextDeclaration | undefined =>
  flow.transitions.find((transition) => transition.from === router)?.next;

function routesMismatch(
  flow: CollectedFlow,
  router: FlowNodeRef,
  meta: RouterMeta,
): RuleViolation[] {
  const routes = new Set(meta.routes.map((declaration) => routeKey(flow, declaration)));
  const chosen = new Set(chooseKeys(chooseOf(flow, router.name)));
  const missingRoutes = [...chosen].filter((key) => !routes.has(key));
  const extraRoutes = [...routes].filter((key) => !chosen.has(key));
  if (missingRoutes.length === 0 && extraRoutes.length === 0) return [];
  const labels = (keys: readonly string[]): string[] =>
    keys.map((key) => flow.nodes.get(key)?.label ?? key);
  const parts = [
    missingRoutes.length > 0 ? `no route for ${labels(missingRoutes).join(", ")}` : "",
    extraRoutes.length > 0
      ? `routes not in its choose(...): ${labels(extraRoutes).join(", ")}`
      : "",
  ].filter((part) => part !== "");
  const message = `router ${router.label}: routes differ from choose(...) — ${parts.join("; ")}`;
  return [
    violation("router.routes-mismatch", message, [
      router.label,
      ...labels([...missingRoutes, ...extraRoutes]),
    ]),
  ];
}

/** Nodes with a transition into `name`. */
export const predecessorsOf = (flow: CollectedFlow, name: string): FlowNodeRef[] =>
  flow.transitions
    .filter((transition) => targetsOf(transition).includes(name))
    .flatMap((transition) => flow.nodes.get(transition.from) ?? []);

function selfWithoutAgent(
  flow: CollectedFlow,
  router: FlowNodeRef,
  meta: RouterMeta,
): RuleViolation[] {
  const usesSelf =
    meta.routes.some((declaration) => isSelf(declaration.target)) ||
    chooseKeys(chooseOf(flow, router.name)).includes(SELF_LABEL);
  if (!usesSelf) return [];
  const before = predecessorsOf(flow, router.name);
  const notAgents = before.filter((ref) => ref.kind !== "agent").map((ref) => ref.label);
  if (before.length > 0 && notAgents.length === 0) return [];
  const why =
    before.length === 0 ? "nothing comes before it" : `${notAgents.join(", ")} come(s) before it`;
  const message = `router ${router.label} routes to Self, but ${why} — Self needs an agent before the router`;
  return [violation("router.self-without-agent-before", message, [router.label, ...notAgents])];
}

/** Each router's texts, its routes against its `choose(...)`, and `Self`. */
export function routerRules(flow: CollectedFlow): RuleViolation[] {
  return [...flow.nodes.values()]
    .filter((ref) => ref.kind === "router")
    .flatMap((router) => {
      const meta = routerMetaOf(router.use);
      if (meta === undefined) return [];
      return [
        ...textRules(router, meta),
        ...routesMismatch(flow, router, meta),
        ...selfWithoutAgent(flow, router, meta),
      ];
    });
}
