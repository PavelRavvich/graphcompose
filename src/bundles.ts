import { defaultBundle, type AgentBundle } from "./bundle.js";
import { demoBundles } from "./demos/index.js"; // demos: delete this line and src/demos/ to remove them

export class UnknownBundleError extends Error {
  override name = "UnknownBundleError";
}

/** Bundles the CLI can run with `--config <name>`. */
export const bundles: Readonly<Record<string, AgentBundle>> = {
  default: defaultBundle,
  ...demoBundles,
};

export function bundleNamed(name: string): AgentBundle {
  const bundle = bundles[name];
  if (bundle === undefined) {
    throw new UnknownBundleError(
      `Unknown config "${name}". Known: ${Object.keys(bundles).join(", ")}`,
    );
  }
  return bundle;
}
