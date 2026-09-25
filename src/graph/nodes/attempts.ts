import type { OnExhausted } from "../../config/types.js";
import type { UsageRecord } from "../../finops/usage.js";
import type { ModelBinding } from "../../llm/registry.js";
import {
  criterionQuestion,
  GOOD_OPTION,
  IMPROVE_INSTRUCTION,
  MEETS_OPTION,
  MISSES_OPTION,
  NOT_GOOD_OPTION,
  QUALITY_QUESTION,
} from "../../prompts/agents.js";
import type { RouteRequest, Router } from "../../routers/index.js";
import { QualityNotReachedError } from "../errors.js";

/** Quality-gated attempts of one agent (config `reasoning`, resolved). */
export interface AgentReasoning {
  readonly judge: Router;
  readonly threshold: number;
  readonly onExhausted: OnExhausted;
  readonly criteria: readonly string[];
  /** The model of each attempt; its length is maxAttempts. */
  readonly models: readonly ModelBinding[];
}

/** One attempt as the result and the Tern show it. */
export interface AttemptRecord {
  readonly agent: string;
  readonly attempt: number;
  readonly thinking: string;
  /** Judge's P(good); null when the judge could not decide. */
  readonly score: number | null;
  readonly returned: boolean;
  /** Why the returned attempt was chosen. */
  readonly reason?: "threshold" | "best" | "last";
}

/** What the agent node lends the attempt loop. */
export interface AttemptRunner {
  readonly agent: string;
  readonly task: string;
  readonly records: UsageRecord[];
  readonly run: (model: ModelBinding, input: string) => Promise<string>;
  readonly paused: () => boolean;
  readonly hasBudget: () => boolean;
}

interface Attempt {
  readonly content: string;
  readonly thinking: string;
  readonly score: number | undefined;
}

/** P(the `yes` option) from a two-option decision; undefined when the judge failed. */
async function probability(
  judge: Router,
  request: RouteRequest,
  yes: string,
  records: UsageRecord[],
): Promise<number | undefined> {
  const outcome = await judge.route(request);
  if (outcome.usage !== undefined) records.push(outcome.usage);
  if (outcome.kind === "failed") return undefined;
  const confidence = outcome.decision.confidence ?? 1;
  return outcome.decision.next === yes ? confidence : 1 - confidence;
}

const thinkingLabel = (thinking: ModelBinding["settings"]["thinking"]): string =>
  typeof thinking === "string" ? thinking : `${String(thinking.budgetTokens)} tokens`;

const answerInput = (task: string, answer: string): string =>
  `Task:\n${task}\n\nAnswer:\n${answer}`;

export const scoreAnswer = (
  judge: Router,
  task: string,
  answer: string,
  records: UsageRecord[],
): Promise<number | undefined> =>
  probability(
    judge,
    {
      instructions: QUALITY_QUESTION,
      input: answerInput(task, answer),
      options: [
        { name: "good", description: GOOD_OPTION },
        { name: "not_good", description: NOT_GOOD_OPTION },
      ],
    },
    "good",
    records,
  );

/** Criteria the answer misses (P(meets) < 0.5) — feedback for the next attempt. */
export async function failedCriteria(
  judge: Router,
  task: string,
  answer: string,
  criteria: readonly string[],
  records: UsageRecord[],
): Promise<string[]> {
  const failed: string[] = [];
  for (const criterion of criteria) {
    const meets = await probability(
      judge,
      {
        instructions: criterionQuestion(criterion),
        input: answerInput(task, answer),
        options: [
          { name: "yes", description: MEETS_OPTION },
          { name: "no", description: MISSES_OPTION },
        ],
      },
      "yes",
      records,
    );
    if (meets !== undefined && meets < 0.5) failed.push(criterion);
  }
  return failed;
}

export const improveInput = (
  input: string,
  previous: string,
  failed: readonly string[],
): string => {
  const flagged =
    failed.length === 0
      ? ""
      : `The reviewer found it falls short on:\n- ${failed.join("\n- ")}\n\n`;
  return `${input}\n\nYour previous answer:\n${previous}\n\n${flagged}${IMPROVE_INSTRUCTION}`;
};

/** Index of the attempt to return: `last`, or the best scored (ties → later; none scored → last). */
export function pickAttempt(attempts: readonly Attempt[], policy: "best" | "last"): number {
  if (policy === "last") return attempts.length - 1;
  let best = -1;
  attempts.forEach((attempt, i) => {
    const current = best < 0 ? undefined : attempts[best]?.score;
    if (attempt.score !== undefined && (current === undefined || attempt.score >= current))
      best = i;
  });
  return best < 0 ? attempts.length - 1 : best;
}

function finish(
  agent: string,
  attempts: readonly Attempt[],
  chosen: number,
  reason: "threshold" | "best" | "last",
): { content: string; attempts: AttemptRecord[] } {
  return {
    content: attempts[chosen]?.content ?? "",
    attempts: attempts.map((attempt, i) => ({
      agent,
      attempt: i + 1,
      thinking: attempt.thinking,
      score: attempt.score ?? null,
      returned: i === chosen,
      ...(i === chosen ? { reason } : {}),
    })),
  };
}

const bestScore = (attempts: readonly Attempt[]): number | undefined =>
  attempts.reduce<number | undefined>(
    (best, a) => (a.score !== undefined && (best === undefined || a.score > best) ? a.score : best),
    undefined,
  );

/**
 * Attempt → score; at the threshold return at once; otherwise feedback and the next attempt, while
 * attempts and budget last. Exhausted → best / last, or `QualityNotReachedError` for `fail`.
 * Undefined when a tool call paused the run (pause seam).
 */
export async function runAttempts(
  runner: AttemptRunner,
  reasoning: AgentReasoning,
  input: string,
): Promise<{ content: string; attempts: AttemptRecord[] } | undefined> {
  const attempts: Attempt[] = [];
  let next = input;
  for (const [k, model] of reasoning.models.entries()) {
    const content = await runner.run(model, next);
    if (runner.paused()) return undefined;
    const score = await scoreAnswer(reasoning.judge, runner.task, content, runner.records);
    attempts.push({ content, thinking: thinkingLabel(model.settings.thinking), score });
    if (score !== undefined && score >= reasoning.threshold)
      return finish(runner.agent, attempts, k, "threshold");
    if (k + 1 >= reasoning.models.length || !runner.hasBudget()) break;
    const failed = await failedCriteria(
      reasoning.judge,
      runner.task,
      content,
      reasoning.criteria,
      runner.records,
    );
    if (!runner.hasBudget()) break;
    next = improveInput(input, content, failed);
  }
  if (reasoning.onExhausted === "fail") {
    throw new QualityNotReachedError(runner.agent, runner.records, {
      bestScore: bestScore(attempts),
      threshold: reasoning.threshold,
      attempts: attempts.length,
    });
  }
  return finish(
    runner.agent,
    attempts,
    pickAttempt(attempts, reasoning.onExhausted),
    reasoning.onExhausted,
  );
}
