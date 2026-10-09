import { modelProviderOf, servesModel } from "./model-provider.decorator.js";
/** What a model is used for: a chat model (agents, compaction, LLM routers) or a decision (Jev). */
export var ModelPurpose;
(function (ModelPurpose) {
  ModelPurpose["Chat"] = "chat";
  ModelPurpose["Decision"] = "decision";
})(ModelPurpose || (ModelPurpose = {}));
const canServe = (provider, purpose) =>
  purpose === ModelPurpose.Chat
    ? provider.handler.chat !== undefined
    : provider.handler.routeTo !== undefined;
const names = (providers) => providers.map((provider) => provider.options.name).join(", ");
/** The workflow's model providers (`settings().modelProviders([...])`) and who serves which model. */
export class ModelProviderDirectory {
  providers;
  defaultProvider;
  constructor(providers, defaultProvider) {
    this.providers = providers;
    this.defaultProvider = defaultProvider;
  }
  /** Instantiates `@ModelProvider` classes (each constructed with no arguments). */
  static of(classes, defaultProvider) {
    const providers = classes.map((cls) => ({
      options: modelProviderOf(cls),
      // a @ModelProvider class is constructed with no arguments (the decorator's type requires it)
      handler: new cls(),
    }));
    return new ModelProviderDirectory(
      providers,
      defaultProvider === undefined ? undefined : modelProviderOf(defaultProvider).name,
    );
  }
  byName(name) {
    return this.providers.find((provider) => provider.options.name === name);
  }
  /** The override, else exactly one provider serving the model for its purpose (the default breaks a tie). */
  resolve(query) {
    const problem = (code, supported) => ({
      kind: "problem",
      problem: {
        code,
        key: query.key,
        value: query.override ?? query.model,
        model: query.model,
        supported,
      },
    });
    if (query.override !== undefined) {
      const provider = this.byName(query.override);
      if (provider === undefined)
        return problem(
          "model.no-provider",
          `no provider named "${query.override}" (registered: ${names(this.providers)})`,
        );
      if (!servesModel(provider.options, query.model) || !canServe(provider, query.purpose)) {
        return problem(
          "model.no-provider",
          `${query.override} does not serve it for ${query.purpose}`,
        );
      }
      return { kind: "resolved", provider };
    }
    const serving = this.providers.filter(
      (provider) => servesModel(provider.options, query.model) && canServe(provider, query.purpose),
    );
    const [only, ...others] = serving;
    if (only === undefined)
      return problem(
        "model.no-provider",
        `no registered provider serves it for ${query.purpose} (registered: ${names(this.providers)})`,
      );
    if (others.length === 0) return { kind: "resolved", provider: only };
    const preferred = serving.find((provider) => provider.options.name === this.defaultProvider);
    return preferred === undefined
      ? problem("model.ambiguous-provider", `served by several providers: ${names(serving)}`)
      : { kind: "resolved", provider: preferred };
  }
}
