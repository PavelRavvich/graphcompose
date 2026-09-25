import type { AgentBundle } from "./bundle.js";
import { ResearchCoder } from "./bundles/research-coder/research-coder.bundle.js";
import { bundleOf, type Class } from "./components/index.js";
import { demoBundles } from "./demos/index.js"; // demos: delete this line and src/demos/ to remove them

export class UnknownBundleError extends Error {
  override name = "UnknownBundleError";
}

/** Bundles the CLI can run with `--config <name>`: `@Bundle` classes. */
export const bundles: Readonly<Record<string, Class>> = {
  default: ResearchCoder,
  ...demoBundles,
};

/** Assembles the named bundle (reads its prompt files, checks its components). */
export async function bundleNamed(name: string): Promise<AgentBundle> {
  const bundle = bundles[name];
  if (bundle === undefined) {
    throw new UnknownBundleError(
      `Unknown config "${name}". Known: ${Object.keys(bundles).join(", ")}`,
    );
  }
  return bundleOf(bundle);
}
