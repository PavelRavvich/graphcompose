import { describe, expect, it, vi } from "vitest";
import { pairwise, runProfile } from "../../src/eval/compare.js";
import { configDiff, formatComparison, percentile, profileReport, } from "../../src/eval/compare-report.js";
import { decide, fakeDeps, usageRecord } from "../helpers.js";
/** A ledger that remembers which account each record went to. */
function keyedLedger(spentToday = 0) {
    const keys = [];
    const records = [];
    return {
        keys,
        spentToday: () => Promise.resolve(spentToday + records.reduce((sum, r) => sum + r.costUsd, 0)),
        record: (key, recs) => {
            keys.push(...recs.map(() => key));
            records.push(...recs);
            return Promise.resolve();
        },
    };
}
const judgeSaying = (outcome) => ({
    name: "judge",
    route: vi.fn(() => Promise.resolve(outcome)),
});
const adequate = (confidence) => ({
    kind: "decided",
    decision: { next: "adequate", reason: "", confidence },
    usage: usageRecord("router:judge", 0.00004),
});
function profileRun(name, spentToday = 0) {
    const ledger = keyedLedger(spentToday);
    const deps = {
        ...fakeDeps({
            "test/router": Array.from({ length: 4 }, () => [decide("alpha"), decide("answer")]).flat(),
            "test/alpha": ["x", "y"],
        }),
        ledger,
    };
    const evaluation = {
        terns: deps.terns,
        ledger,
        judge: judgeSaying(adequate(0.8)),
        account: { key: "test-bundle:eval", dailyCap: 5 },
    };
    return { run: { name, deps, evaluation }, ledger };
}
describe("compare — per profile", () => {
    it("AC4, AC5: runs every task on the eval account, scores, costs and times it", async () => {
        const { run, ledger } = profileRun("base");
        let now = 0;
        const outcome = await runProfile(run, ["t1", "t2"], () => (now += 100));
        expect(outcome).toMatchObject({
            name: "base",
            version: "1.0.0",
            scores: [0.8, 0.8],
            failed: 0,
        });
        expect(outcome.answers).toHaveLength(2);
        expect(outcome.latenciesMs).toEqual([100, 100]);
        expect(new Set(ledger.keys)).toEqual(new Set(["test-bundle:eval"]));
    });
    it("AC5: stops cleanly when the eval budget is spent", async () => {
        const { run } = profileRun("base", 5);
        const outcome = await runProfile(run, ["t1", "t2"]);
        expect(outcome).toMatchObject({ answers: [], stoppedBy: "eval budget exhausted" });
    });
});
describe("compare — pairwise", () => {
    const base = {
        name: "base",
        version: "1",
        answers: ["a1", "a2", "a3", undefined],
        scores: [],
        costUsd: 0,
        latenciesMs: [],
        failed: 0,
    };
    const other = { ...base, name: "v2", answers: ["b1", "b2", "b3", "b4"] };
    const evaluationWith = (...outcomes) => {
        const route = vi.fn();
        outcomes.forEach((o) => route.mockResolvedValueOnce(o));
        return {
            terns: fakeDeps({}).terns,
            ledger: keyedLedger(),
            judge: { name: "judge", route },
            account: { key: "k:eval", dailyCap: 5 },
        };
    };
    const pick = (next, confidence) => ({
        kind: "decided",
        decision: { next, reason: "", confidence },
    });
    it("AC4: wins, losses and ties with randomised A/B order; missing answers are skipped", async () => {
        const evaluation = evaluationWith(pick("first", 0.9), pick("first", 0.9), pick("second", 0.55));
        const order = [0.1, 0.9, 0.1];
        const result = await pairwise(evaluation, ["t1", "t2", "t3", "t4"], base, other, () => order.shift() ?? 0);
        expect(result).toEqual({ wins: 1, losses: 1, ties: 1 });
        const firstInput = vi.mocked(evaluation.judge.route).mock.calls[0]?.[0].input ?? "";
        expect(firstInput).toContain("Answer 1:\nb1");
    });
});
describe("compare — report", () => {
    it("AC4: shows what differs between profiles, without prompt texts or the version", () => {
        const a = fakeDeps({});
        const b = {
            ...a,
            config: {
                ...a.config,
                version: "1.0.0-x",
                agents: {
                    ...a.config.agents,
                    alpha: { ...a.config.agents.alpha, thinking: "low" },
                },
            },
            prompts: {
                ...a.prompts,
                alpha: Object.assign(async () => "changed", { options: { prompt: "changed" } }),
            },
        };
        const diff = configDiff(a, b);
        console.log("DIFF:", diff);
        expect(diff).toContain('agents.alpha.thinking: — → "low"');
        expect(diff).toContain("prompts.alpha.prompt: changed");
        expect(diff.some((line) => line.startsWith("version"))).toBe(false);
    });
    it("AC4: a table row per profile with mean, pairwise, cost, latency and the diff", () => {
        const outcome = {
            name: "v2",
            version: "1.0.0-x",
            answers: ["a", "b"],
            scores: [0.8, 0.6],
            costUsd: 0.02,
            latenciesMs: [1000, 3000],
            failed: 0,
        };
        const row = profileReport(outcome, { wins: 2, losses: 0, ties: 0 }, [
            'agents.alpha.thinking: — → "low"',
        ]);
        const lines = formatComparison(2, [{ ...row, name: "base", pairwise: null, diff: [] }, row]);
        expect(row).toMatchObject({
            meanScore: 0.7,
            costPerTaskUsd: 0.01,
            latencyP50Ms: 1000,
            latencyP95Ms: 3000,
        });
        expect(lines).toContain("v2 | 1.0.0-x | 0.70 | 2/0/0 | $0.0200 | $0.0100 | 1.0 | 3.0 | 0");
        expect(lines).toContain('  agents.alpha.thinking: — → "low"');
        expect(percentile([], 50)).toBeNull();
    });
});
