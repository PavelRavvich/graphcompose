import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { recordUsage, totalCost } from "../finops/usage.js";
import { DEFAULT_COMPACTION_PROMPT } from "../prompts/compaction.js";
const asTurns = (terns) => terns
    .map((t) => `Q: ${t.task}\nA: ${t.status === "answered" ? t.replyWith : `(${t.status}) ${t.replyWith}`}`)
    .join("\n\n");
const compactionInput = (previous, window) => (previous.length === 0 ? "" : `Earlier turns (context only):\n${asTurns(previous)}\n\n`) +
    `Turns to compact:\n${asTurns(window)}`;
/**
 * After a finished turn: when the thread has ≥ `every` turns not yet summarised, the oldest `every`
 * become one self-contained summary (the previous raw window is read-only context; summaries never
 * read summaries). Never throws — a failure leaves the turns raw for the next turn to retry.
 */
export async function compactIfDue(deps, run) {
    const settings = deps.config.compaction;
    const model = deps.registry.compaction;
    const usage = [];
    if (settings === undefined || model === undefined || run.budgetLeftUsd <= 0)
        return { usage };
    try {
        const window = (await deps.terns.uncovered(run.threadId)).slice(0, settings.every);
        const [first] = window;
        const last = window.at(-1);
        if (window.length < settings.every || first === undefined || last === undefined)
            return { usage };
        const previous = await deps.terns.before(run.threadId, first.id, settings.every);
        const response = await model.model.invoke([
            new SystemMessage(deps.compactionPrompt ?? DEFAULT_COMPACTION_PROMPT),
            new HumanMessage(compactionInput(previous, window)),
        ], { callbacks: run.callbacks, runName: "compaction" });
        usage.push(recordUsage("compaction", model.settings, response));
        const text = response.text.trim();
        if (text === "")
            return { usage };
        await deps.terns.addSummary({
            threadId: run.threadId,
            bundle: deps.config.name,
            fromTernId: first.id,
            toTernId: last.id,
            turns: window.length,
            text,
            costUsd: totalCost(usage),
        });
        const count = await deps.terns.summaryCount(run.threadId);
        return {
            usage,
            compacted: {
                fromTurn: await deps.terns.turnNumber(run.threadId, first.id),
                toTurn: await deps.terns.turnNumber(run.threadId, last.id),
                summaries: Math.min(count, settings.keep),
                keep: settings.keep,
            },
        };
    }
    catch {
        return { usage };
    }
}
