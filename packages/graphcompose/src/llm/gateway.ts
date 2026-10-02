import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ResolvedModelSettings } from "../config/types.js";
import {
  createJevRouter,
  createLlmRouter,
  type RouteOutcome,
  type RouteRequest,
  type Router,
} from "../routers/index.js";
import type { JevClient } from "./jev-client.js";
import type { ModelFactory } from "./registry.js";
import { providerClients, type ProviderClientOptions } from "./provider-clients.js";
import type { ModelProviderDirectory } from "../models/resolve.js";

/** Who a chat model is for: what a substitute gateway (scripted, replayed) keys its answers on. */
export type ChatModelUser =
  | { readonly kind: "agent"; readonly agent: string }
  | { readonly kind: "compaction" }
  | { readonly kind: "router"; readonly router: string };

/** A chat model request: its user and complete settings (agents, compaction, LLM routers). */
export interface ChatModelSpec {
  readonly user: ChatModelUser;
  readonly settings: ResolvedModelSettings;
}

/** A router's model, resolved: Jev by id, or a chat model with complete settings. */
export type DecisionModel =
  | { readonly kind: "jev"; readonly model: string }
  | { readonly kind: "llm"; readonly settings: ResolvedModelSettings };

/** A decision request: which router asks, on which model, over which routes. */
export interface DecisionSpec {
  readonly router: string;
  readonly model: DecisionModel;
  readonly request: RouteRequest;
}

/**
 * The one seam every model call goes through. Agents and compaction get their chat model from
 * `chatModel`; routers and guards decide through `decide`.
 * Model providers, scripted and replayed models replace the gateway, nothing behind it.
 */
export interface ModelGateway {
  readonly chatModel: (spec: ChatModelSpec) => BaseChatModel;
  readonly decide: (spec: DecisionSpec) => Promise<RouteOutcome>;
}

/** The raw clients the default gateway calls. */
export interface ModelClients {
  readonly chatModel: ModelFactory;
  readonly jevClient: JevClient;
}

/** Settings that make a different client; identical ones share one. */
const clientKey = (settings: ResolvedModelSettings): string =>
  JSON.stringify([
    settings.model,
    settings.temperature,
    settings.maxTokens,
    settings.reasoning,
    settings.promptCaching,
  ]);

/** The default gateway over raw clients: one chat client per settings, Jev or LLM decisions. */
export function createModelGateway(clients: ModelClients): ModelGateway {
  const cache = new Map<string, BaseChatModel>();
  const chatModel = ({ settings }: ChatModelSpec): BaseChatModel => {
    const key = clientKey(settings);
    const model = cache.get(key) ?? clients.chatModel(settings);
    cache.set(key, model);
    return model;
  };
  const strategyOf = ({ router, model }: DecisionSpec): Router =>
    model.kind === "jev"
      ? createJevRouter({ name: router, model: model.model, client: clients.jevClient })
      : createLlmRouter({
          name: router,
          model: chatModel({ user: { kind: "router", router }, settings: model.settings }),
          settings: model.settings,
        });
  return { chatModel, decide: (spec) => strategyOf(spec).route(spec.request) };
}

/**
 * Production: every model from the workflow's model providers (`settings().modelProviders([...])`) —
 * chat models and Jev decisions, each through its provider's connection; keys from `env`.
 */
export function createProviderGateway(
  directory: ModelProviderDirectory,
  options: ProviderClientOptions,
): ModelGateway {
  return createModelGateway(providerClients(directory, options));
}
