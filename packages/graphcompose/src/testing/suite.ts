import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Dataset } from "./dataset.js";
import type { BaseJudge } from "../components/judge-decorators.js";
import { randomUUID } from "crypto";

export interface SuiteConfig<TInput = unknown, TExpected = unknown> {
  name: string;
  dataset: Dataset<TInput, TExpected>;
  judges: BaseJudge[];
}

export interface SuiteEvaluateOptions {
  chatModel: BaseChatModel;
  concurrency?: number;
}

export interface CaseResult {
  caseId: string;
  passed: boolean;
  feedback?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: Record<string, any>;
  output?: unknown;
  error?: Error;
}

export interface SuiteReport {
  suiteName: string;
  totalCases: number;
  passCount: number;
  failCount: number;
  passRate: number;
  metrics: Record<string, { mean: number }>;
  results: CaseResult[];
}

export class Suite<TInput = unknown, TExpected = unknown> {
  constructor(public readonly config: SuiteConfig<TInput, TExpected>) {}

  /* eslint-disable max-lines-per-function */
  // eslint-disable-next-line complexity
  async evaluate(
    target: (input: TInput) => Promise<unknown>,
    options: SuiteEvaluateOptions
  ): Promise<SuiteReport> {
    const concurrency = options.concurrency ?? 5;
    const cases = [...this.config.dataset.cases];
    const results: CaseResult[] = [];

    // Parallel execution with limit
    while (cases.length > 0) {
      const chunk = cases.splice(0, concurrency);
      const chunkPromises = chunk.map(async (tc) => {
        const id = tc.id ?? randomUUID();
        try {
          const output = await target(tc.input);
          
          let allPassed = true;
          let allFeedback = "";
          const allMetrics: Record<string, unknown> = {};

          for (const judge of this.config.judges) {
            const judgeRes = await judge.evaluate(
               
               
              { replyWith: output as string, ...(output as object), expected: tc.expected },
              { runId: id, chatModel: options.chatModel }
            );

            if (!judgeRes.passed) allPassed = false;
            if (judgeRes.feedback) allFeedback += judgeRes.feedback + "\n";
            if (judgeRes.metrics) Object.assign(allMetrics, judgeRes.metrics);
          }

          return {
            caseId: id,
            passed: allPassed,
            feedback: allFeedback.trim() || undefined,
            metrics: allMetrics,
            output
          };
        } catch (error) {
          return {
            caseId: id,
            passed: false,
            feedback: "Target threw an exception",
            metrics: {},
            error: error instanceof Error ? error : new Error(String(error))
          };
        }
      });
      results.push(...(await Promise.all(chunkPromises)));
    }

    const passCount = results.filter((r) => r.passed).length;
    const failCount = results.length - passCount;
    const passRate = results.length > 0 ? passCount / results.length : 0;

    // Aggregate metrics
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};
    for (const r of results) {
      for (const [k, v] of Object.entries(r.metrics)) {
        if (typeof v === "number") {
          metricSums[k] = (metricSums[k] ?? 0) + v;
          metricCounts[k] = (metricCounts[k] ?? 0) + 1;
        }
      }
    }

    const aggregatedMetrics: Record<string, { mean: number }> = {};
    for (const k of Object.keys(metricSums)) {
      aggregatedMetrics[k] = { mean: (metricSums[k] ?? 0) / (metricCounts[k] ?? 1) };
    }

    return {
      suiteName: this.config.name,
      totalCases: results.length,
      passCount,
      failCount,
      passRate,
      metrics: aggregatedMetrics,
      results
    };
  }
}
