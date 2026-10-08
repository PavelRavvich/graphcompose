import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { AgentsConfigSchema, AgentSettingsSchema, CompactionSettingsSchema } from "./types.js";
/** A profile names a variant of a workflow and lists only what differs (Spring-Boot-like). */
export class ProfileError extends Error {
    name = "ProfileError";
}
/** Every field optional at every depth; unknown keys rejected (typos surface with their path). */
function deepPartial(schema) {
    const inner = schema instanceof z.ZodOptional ? schema.unwrap() : schema;
    if (!(inner instanceof z.ZodObject))
        return inner.optional();
    const shape = Object.fromEntries(Object.entries(inner.shape).map(([key, value]) => [
        key,
        deepPartial(value),
    ]));
    return z.strictObject(shape).optional();
}
const defaultsShape = AgentsConfigSchema.shape.defaults;
const PromptOverride = z.union([z.string().min(1), z.strictObject({ file: z.string().min(1) })]);
/** `profiles/<workflow>/<profile>.yaml` — validated; JSON Schema in schema/profile.schema.json. */
export const ProfileSchema = z.strictObject({
    profile: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes"),
    /** Must differ from the base version, e.g. 1.3.0-low-thinking. */
    version: z.string().min(1),
    defaults: deepPartial(defaultsShape),
    compaction: deepPartial(CompactionSettingsSchema),
    agents: z.record(z.string(), deepPartial(AgentSettingsSchema)).optional(),
    /** Replaces an agent's system instructions: inline text or a file relative to the profile. */
    prompts: z.record(z.string(), PromptOverride).optional(),
});
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Objects merge key by key; arrays and scalars replace. */
export function deepMerge(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override))
        return override === undefined ? base : override;
    const merged = { ...base };
    for (const [key, value] of Object.entries(override))
        merged[key] = deepMerge(base[key], value);
    return merged;
}
/** Reads and validates a profile file; errors name the file and the key. */
export async function loadProfile(file) {
    const raw = parseYaml(await readFile(file, "utf8"));
    const parsed = ProfileSchema.safeParse(raw);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const key = issue?.path.join(".") ?? "";
        throw new ProfileError(`${file}: ${key === "" ? "" : `${key}: `}${issue?.message ?? "invalid profile"}`);
    }
    return parsed.data;
}
export const profileFile = (root, bundle, profile) => join(root, "profiles", bundle, `${profile}.yaml`);
/** Prompt overrides as text: inline strings, or files relative to the profile file. */
export async function profilePrompts(profile, file) {
    const entries = await Promise.all(Object.entries(profile.prompts ?? {}).map(async ([agent, prompt]) => [
        agent,
        typeof prompt === "string"
            ? prompt
            : await readFile(resolve(dirname(file), prompt.file), "utf8"),
    ]));
    return Object.fromEntries(entries);
}
/** JSON Schema of profiles (for `# yaml-language-server: $schema=…`); lazy parts become open. */
export const profileJsonSchema = () => z.toJSONSchema(ProfileSchema, { unrepresentable: "any", io: "input" });
