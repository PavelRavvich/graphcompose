export class MissingGuardPromptError extends Error {
  name = "MissingGuardPromptError";
}
/** Config + texts → ready guards. A configured guard without texts stops startup. */
export function buildGuards(config, texts, routerFor) {
  const side = (settings = {}) =>
    Object.entries(settings).map(([name, guard]) => {
      const text = texts[name];
      if (text === undefined) throw new MissingGuardPromptError(`No texts for guard "${name}"`);
      return {
        name,
        ...text,
        threshold: guard.threshold,
        refusal: guard.refusal,
        router: routerFor(name, guard.model),
      };
    });
  return { input: side(config?.input), output: side(config?.output) };
}
