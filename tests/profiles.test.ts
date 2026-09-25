import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ResearchCoder } from "../src/bundles/research-coder/research-coder.bundle.js";
import { bundleOf } from "../src/components/index.js";
import {
  deepMerge,
  loadProfile,
  ProfileError,
  profileJsonSchema,
  type Profile,
} from "../src/config/profiles.js";
import { applyProfile, withProfile } from "../src/profile-bundle.js";

const base = await bundleOf(ResearchCoder);
/** Raw (possibly invalid) profile content, as a YAML file would give it. */
const profile = (overrides: Record<string, unknown> = {}): Profile =>
  ({ profile: "variant", version: "1.0.0-variant", ...overrides }) as Profile;

async function profileFile(
  content: string,
  name = "variant",
): Promise<{ root: string; file: string }> {
  const root = await mkdtemp(join(tmpdir(), "profiles-"));
  const file = join(root, "profiles", base.config.name, `${name}.yaml`);
  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(join(root, "profiles", base.config.name), { recursive: true }),
  );
  await writeFile(file, content);
  return { root, file };
}

describe("profiles — merge rules", () => {
  it("AC1: objects merge key by key, arrays and scalars replace", () => {
    expect(
      deepMerge({ a: { x: 1, y: 2 }, list: [1, 2], s: "a" }, { a: { y: 3 }, list: [9], s: "b" }),
    ).toEqual({
      a: { x: 1, y: 3 },
      list: [9],
      s: "b",
    });
  });

  it("AC1: a profile overrides only what it lists; prompts replaced per agent", () => {
    const applied = applyProfile(
      base,
      profile({ agents: { coder: { thinking: "high" } }, defaults: { history: { limit: 2 } } }),
      { coder: "You are a terse coder." },
      "p.yaml",
    );

    expect(applied.config.version).toBe("1.0.0-variant");
    expect(applied.config.agents.coder?.thinking).toBe("high");
    expect(applied.config.agents.coder?.model).toBe(base.config.agents.coder?.model);
    expect(applied.config.defaults.history.limit).toBe(2);
    expect(applied.prompts.coder).toBe("You are a terse coder.");
    expect(applied.prompts.researcher).toBe(base.prompts.researcher);
  });

  it("AC1: loads a YAML profile with a prompt file relative to it; base means no profile", async () => {
    const { root, file } = await profileFile(
      "profile: variant\nversion: 1.0.0-variant\nprompts:\n  coder: { file: coder.md }\n",
    );
    await writeFile(join(root, "profiles", base.config.name, "coder.md"), "From a file.");

    const applied = await withProfile(base, "variant", root);

    expect(applied.prompts.coder).toBe("From a file.");
    expect(await withProfile(base, "base", root)).toBe(base);
    expect(await loadProfile(file)).toMatchObject({ profile: "variant" });
  });
});

describe("profiles — validation", () => {
  it("AC1: a typo in a key is rejected with the file and the path", async () => {
    const { file } = await profileFile(
      "profile: variant\nversion: 2.0.0\nagents:\n  coder:\n    thinkin: low\n",
    );

    await expect(loadProfile(file)).rejects.toThrow(`${file}: agents.coder`);
  });

  it("AC1: unknown agents, the base version and invalid values are rejected", () => {
    expect(() =>
      applyProfile(base, profile({ agents: { ghost: { thinking: "low" } } }), {}, "p.yaml"),
    ).toThrow(/unknown in bundle "research-coder": agents\.ghost/);
    expect(() =>
      applyProfile(base, profile({ version: base.config.version }), {}, "p.yaml"),
    ).toThrow(ProfileError);
    expect(() =>
      applyProfile(base, profile({ budget: { runBudgetCap: -1 } }), {}, "p.yaml"),
    ).toThrow(/p\.yaml: budget\.runBudgetCap/);
  });

  it("AC1: schema/profile.schema.json is up to date (run `npm run schema`)", async () => {
    const committed: unknown = JSON.parse(await readFile("schema/profile.schema.json", "utf8"));

    expect(committed).toEqual(profileJsonSchema());
  });
});
