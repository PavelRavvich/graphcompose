import { createHash } from "node:crypto";

/** JSON with object keys sorted — the same value always serialises the same way. */
export function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Short content hash: equal inputs → equal versions, any change → a new version. */
export const versionOf = (value: unknown): string =>
  createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 12);
