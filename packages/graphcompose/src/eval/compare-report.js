import { configSnapshot } from "../run/versions.js";
export function percentile(values, p) {
    if (values.length === 0)
        return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? null;
}
/** Flattened `path → value`; prompts show only that they changed, not their text. */
function flatten(value, path = "", out = new Map()) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, item] of Object.entries(value))
            flatten(item, path === "" ? key : `${path}.${key}`, out);
    }
    else if (value !== undefined) {
        out.set(path, JSON.stringify(value));
    }
    return out;
}
/** What differs between two runs' configs and prompts: `agents.scout.thinking: "none" → "low"`. */
export function configDiff(base, other) {
    const a = flatten(configSnapshot(base));
    const b = flatten(configSnapshot(other));
    const keys = [...new Set([...a.keys(), ...b.keys()])]
        .filter((key) => key !== "config.version")
        .sort();
    return keys.flatMap((key) => {
        const before = a.get(key);
        const after = b.get(key);
        if (before === after)
            return [];
        if (key.startsWith("prompts.") || key === "compactionPrompt")
            return [`${key}: changed`];
        return [`${key.replace(/^config\./, "")}: ${before ?? "—"} → ${after ?? "—"}`];
    });
}
export function profileReport(outcome, pair, diff) {
    const scored = outcome.scores.filter((s) => s !== undefined);
    const done = outcome.answers.filter((a) => a !== undefined).length;
    return {
        name: outcome.name,
        version: outcome.version,
        meanScore: scored.length === 0 ? null : scored.reduce((sum, s) => sum + s, 0) / scored.length,
        scored: scored.length,
        pairwise: pair,
        costUsd: outcome.costUsd,
        costPerTaskUsd: done === 0 ? 0 : outcome.costUsd / done,
        latencyP50Ms: percentile(outcome.latenciesMs, 50),
        latencyP95Ms: percentile(outcome.latenciesMs, 95),
        failed: outcome.failed,
        diff,
        ...(outcome.stoppedBy === undefined ? {} : { stoppedBy: outcome.stoppedBy }),
    };
}
const num = (value, digits) => value === null ? "—" : value.toFixed(digits);
/** A readable table plus each profile's diff against the baseline. */
export function formatComparison(tasks, rows) {
    const lines = [
        `${String(tasks)} tasks`,
        "profile | version | mean | vs base (w/l/t) | cost | per task | p50 s | p95 s | failed",
    ];
    for (const r of rows) {
        const vs = r.pairwise === null
            ? "baseline"
            : `${String(r.pairwise.wins)}/${String(r.pairwise.losses)}/${String(r.pairwise.ties)}`;
        const p50 = r.latencyP50Ms === null ? null : r.latencyP50Ms / 1000;
        const p95 = r.latencyP95Ms === null ? null : r.latencyP95Ms / 1000;
        lines.push(`${r.name} | ${r.version} | ${num(r.meanScore, 2)} | ${vs} | $${r.costUsd.toFixed(4)} | $${r.costPerTaskUsd.toFixed(4)} | ${num(p50, 1)} | ${num(p95, 1)} | ${String(r.failed)}${r.stoppedBy === undefined ? "" : ` (${r.stoppedBy})`}`);
    }
    for (const r of rows.filter((row) => row.pairwise !== null)) {
        lines.push("", `${r.name} vs baseline:`, ...(r.diff.length === 0 ? ["  (no config difference)"] : r.diff.map((d) => `  ${d}`)));
    }
    return lines;
}
