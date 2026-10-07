import { isDayCapReached } from "../graph/limits.js";
import { runAgent } from "../index.js";
import { judgeRequest, scoreOf } from "./eval.js";
import { FIRST_BETTER, PAIR_INSTRUCTIONS, SECOND_BETTER } from "./prompts.js";
/** A pairwise verdict is a tie when the judge is less sure than this. */
export const TIE_BELOW = 0.6;
async function judged(evaluation, request) {
    const outcome = await evaluation.judge.route(request);
    if (outcome.usage !== undefined)
        await evaluation.ledger.record(evaluation.account.key, [outcome.usage]);
    return outcome;
}
/** Runs every task as a first contact on the eval account; scores each answer with the judge. */
export async function runProfile(run, tasks, clock = Date.now) {
    const answers = [];
    const scores = [];
    const latenciesMs = [];
    let costUsd = 0;
    let failed = 0;
    for (const task of tasks) {
        const started = clock();
        try {
            const result = await runAgent({ task }, run.deps, { account: run.evaluation.account });
            latenciesMs.push(clock() - started);
            costUsd += result.cost.totalUsd;
            const [tern] = await run.deps.terns.byIds([result.ternId]);
            answers.push(result.answer);
            scores.push(tern === undefined ? undefined : scoreOf(await judged(run.evaluation, judgeRequest(tern))));
        }
        catch (error) {
            if (isDayCapReached(error)) {
                return {
                    name: run.name,
                    version: run.deps.config.version,
                    answers,
                    scores,
                    costUsd,
                    latenciesMs,
                    failed,
                    stoppedBy: "eval budget exhausted",
                };
            }
            failed += 1;
            answers.push(undefined);
            scores.push(undefined);
        }
    }
    return {
        name: run.name,
        version: run.deps.config.version,
        answers,
        scores,
        costUsd,
        latenciesMs,
        failed,
    };
}
/**
 * Per task: which of baseline / other answers better. A/B order is randomised per task (position
 * bias); a judge failure or an unsure verdict is a tie; a missing answer is not compared.
 */
export async function pairwise(evaluation, tasks, baseline, other, random = Math.random) {
    const tally = { wins: 0, losses: 0, ties: 0 };
    for (const [i, task] of tasks.entries()) {
        const a = baseline.answers[i];
        const b = other.answers[i];
        if (a === undefined || b === undefined)
            continue;
        const otherFirst = random() < 0.5;
        const [first, second] = otherFirst ? [b, a] : [a, b];
        const outcome = await judged(evaluation, {
            instructions: PAIR_INSTRUCTIONS,
            input: `Task:\n${task}\n\nAnswer 1:\n${first}\n\nAnswer 2:\n${second}`,
            options: [
                { name: "first", description: FIRST_BETTER },
                { name: "second", description: SECOND_BETTER },
            ],
        });
        const sure = outcome.kind === "decided" && (outcome.decision.confidence ?? 1) >= TIE_BELOW;
        if (!sure)
            tally.ties += 1;
        else if ((outcome.decision.next === "first") === otherFirst)
            tally.wins += 1;
        else
            tally.losses += 1;
    }
    return tally;
}
