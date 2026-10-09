import { connectionOf } from "./connections.js";
import { priceOf } from "./cost.js";
import { settingProblems } from "./setting-problems.js";
/** Problems found without asking any provider: a model nobody serves, or several do. */
export function resolutionProblems(uses, directory) {
  return uses.flatMap((use) => {
    const resolution = directory.resolve(use);
    return resolution.kind === "problem" ? [resolution.problem] : [];
  });
}
function priceProblems(use, provider) {
  const cost = provider.options.cost;
  if (cost.kind === "from-response" || use.settings === undefined) return [];
  if (use.settings.price !== undefined || priceOf(cost, use.model) !== undefined) return [];
  return [
    {
      code: "model.no-price",
      key: use.key,
      value: use.model,
      model: use.model,
      supported: `${provider.options.name} prices only ${Object.keys(cost.prices).join(", ")}`,
    },
  ];
}
async function useProblems(use, provider, connection) {
  const capabilities = await provider.handler.capabilities(use.model, connection);
  if (capabilities === undefined) {
    return [
      {
        code: "model.unknown-model",
        key: use.key,
        value: use.model,
        model: use.model,
        supported: `${provider.options.name} does not list it`,
      },
    ];
  }
  const effective = {
    reasoning: use.settings?.reasoning ?? provider.options.reasoning,
    promptCaching: use.settings?.promptCaching ?? provider.options.promptCaching,
  };
  return [...settingProblems(use, effective, capabilities), ...priceProblems(use, provider)];
}
/**
 * Checks every model use against what its provider says the model supports — **all** problems at
 * once, each with the setting's key, its value, the model and what the model supports. Nothing is
 * replaced by a nearby setting. Runs at startup and in `gc check --models`, before any model call.
 */
export async function checkModelUses(uses, directory, options) {
  const connections = new Map();
  const connectionFor = (provider) => {
    const known = connections.get(provider.options.name);
    if (known !== undefined) return known;
    const made = connectionOf(provider.options, { ...options, requireKeys: false });
    connections.set(provider.options.name, made);
    return made;
  };
  const found = await Promise.all(
    uses.map((use) => {
      const resolution = directory.resolve(use);
      return resolution.kind === "problem"
        ? Promise.resolve([resolution.problem])
        : useProblems(use, resolution.provider, connectionFor(resolution.provider));
    }),
  );
  return found.flat();
}
