import { isDayCapReached } from "../graph/limits.js";
import { runAgent } from "../index.js";
import { scoreTerns } from "./eval.js";
/**
 * `npm run replay`: re-runs the tasks of an old prompt version with the current config (as new
 * threads, `replayOf` set), scores both sides and compares. All spend goes to the eval account.
 */
export async function replay(run, evaluation, options) {
  const bundle = run.config.name;
  const originals = await run.terns.byVersion(bundle, options.promptVersion, options.limit);
  const unscored = await run.terns.unscored(bundle, options.promptVersion, options.limit);
  const baseline = await scoreTerns(evaluation, unscored);
  const replayedIds = [];
  let costUsd = baseline.costUsd;
  let stoppedBy = baseline.stoppedBy;
  for (const original of originals) {
    if (stoppedBy !== undefined) break;
    try {
      const result = await runAgent({ task: original.task }, run, {
        replayOf: original.id,
        account: evaluation.account,
      });
      replayedIds.push(result.ternId);
      costUsd += result.cost.totalUsd;
    } catch (error) {
      if (isDayCapReached(error)) stoppedBy = "eval budget exhausted";
    }
  }
  const scoring = await scoreTerns(evaluation, await run.terns.byIds(replayedIds));
  return {
    promptVersion: options.promptVersion,
    tasks: originals.length,
    replayed: replayedIds.length,
    before: await run.terns.meanScore(originals.map((tern) => tern.id)),
    after: await run.terns.meanScore(replayedIds),
    costUsd: costUsd + scoring.costUsd,
    ...(stoppedBy === undefined ? {} : { stoppedBy: stoppedBy }),
  };
}
