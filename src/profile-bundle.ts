import type { AgentBundle } from "./bundle.js";
import {
  deepMerge,
  loadProfile,
  profileFile,
  profilePrompts,
  ProfileError,
  type Profile,
} from "./config/profiles.js";
import { AgentsConfigSchema, type AgentsConfigOf } from "./config/types.js";

const unknownKeys = (keys: readonly string[], known: object): string[] =>
  keys.filter((key) => !Object.hasOwn(known, key));

function checkNames(bundle: AgentBundle, profile: Profile, file: string): void {
  const base = bundle.config;
  if (profile.version === base.version) {
    throw new ProfileError(`${file}: version: must differ from the base version ${base.version}`);
  }
  const unknown = [
    ...unknownKeys(Object.keys(profile.agents ?? {}), base.agents).map((a) => `agents.${a}`),
    ...unknownKeys(Object.keys(profile.prompts ?? {}), base.agents).map((a) => `prompts.${a}`),
    ...unknownKeys(Object.keys(profile.routers ?? {}), base.routers).map((r) => `routers.${r}`),
  ];
  if (unknown.length > 0) {
    throw new ProfileError(`${file}: unknown in bundle "${base.name}": ${unknown.join(", ")}`);
  }
}

/** The bundle with a profile applied: config deep-merged and re-validated, prompts replaced per agent. */
export function applyProfile(
  bundle: AgentBundle,
  profile: Profile,
  prompts: Readonly<Record<string, string>>,
  file: string,
): AgentBundle {
  checkNames(bundle, profile, file);
  const merged = deepMerge(bundle.config, {
    version: profile.version,
    defaults: profile.defaults,
    budget: profile.budget,
    routers: profile.routers,
    compaction: profile.compaction,
    agents: profile.agents,
  });
  const parsed = AgentsConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ProfileError(
      `${file}: ${issue?.path.join(".") ?? ""}: ${issue?.message ?? "invalid"}`,
    );
  }
  return {
    ...bundle,
    config: merged as AgentsConfigOf<string>, // validated above; keeps the bundle's literal shape
    prompts: { ...bundle.prompts, ...prompts },
  };
}

/** `--profile <name>` on a bundle: profiles/<bundle>/<name>.yaml under `root`; `base` = none. */
export async function withProfile(
  bundle: AgentBundle,
  profile: string | undefined,
  root: string = process.cwd(),
): Promise<AgentBundle> {
  if (profile === undefined || profile === "base") return bundle;
  const file = profileFile(root, bundle.config.name, profile);
  const loaded = await loadProfile(file);
  return applyProfile(bundle, loaded, await profilePrompts(loaded, file), file);
}
