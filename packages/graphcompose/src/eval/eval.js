import { ADEQUATE, INADEQUATE, JUDGE_INSTRUCTIONS } from "./prompts.js";
export const judgeRequest = (tern) => ({
    instructions: JUDGE_INSTRUCTIONS,
    input: `Task:\n${tern.task}\n\nAnswer:\n${tern.answer}`,
    options: [
        { name: "adequate", description: ADEQUATE },
        { name: "inadequate", description: INADEQUATE },
    ],
});
/** P(adequate): the judge's confidence in its choice, 1 when it reports none. */
export function scoreOf(outcome) {
    if (outcome.kind === "failed")
        return undefined;
    const confidence = outcome.decision.confidence ?? 1;
    return outcome.decision.next === "adequate" ? confidence : 1 - confidence;
}
/** Scores the given Terns within the eval budget; a judge failure leaves a Tern unscored. */
export async function scoreTerns(deps, terns) {
    let scored = 0;
    let costUsd = 0;
    for (const tern of terns) {
        if ((await deps.ledger.spentToday(deps.account.key)) >= deps.account.dailyCap) {
            return { scored, costUsd, stoppedBy: "eval budget exhausted" };
        }
        const outcome = await deps.judge.route(judgeRequest(tern));
        if (outcome.usage !== undefined) {
            await deps.ledger.record(deps.account.key, [outcome.usage]);
            costUsd += outcome.usage.costUsd;
        }
        const score = scoreOf(outcome);
        if (score === undefined)
            continue;
        await deps.terns.saveScore(tern.id, deps.judge.name, score);
        scored += 1;
    }
    return { scored, costUsd };
}
/** `npm run eval`: score answered, unscored Terns (optionally of one prompt version). */
export async function evaluate(deps, bundle, options) {
    return scoreTerns(deps, await deps.terns.unscored(bundle, options.promptVersion, options.limit));
}
