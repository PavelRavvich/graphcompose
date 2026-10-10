import { BaseChatModel } from "@langchain/core/language_models/chat_models";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AppState } from "../core/observability.js";
import { recordComponent } from "./metadata.js";
import type { Class } from "./injection.js";

export interface JudgeRule {
  readonly min?: number;
  readonly max?: number;
  readonly exact?: unknown;
  readonly feedback: string;
}

export interface JudgeMeta {
  readonly name: string;
  readonly description?: string;
  readonly model?: string;
  readonly systemPrompt?: string;
  readonly metrics?: Record<string, JudgeRule>;
}

export function Judge(meta: JudgeMeta): ClassDecorator {
  return function (target) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    recordComponent(target as unknown as Class, {
      kind: "judge",
      meta,
    });
  };
}

export interface JudgeContext<TExec = unknown> {
  readonly runId: string;
  readonly executionContext?: TExec;
  readonly idempotencyKey?: string;
  readonly chatModel?: BaseChatModel;
}

export interface JudgeResult {
  readonly passed: boolean;
  readonly feedback?: string;
  readonly metrics?: Record<string, number | string | boolean>;
}

import { z } from "zod";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { componentOf } from "./metadata.js";

export abstract class BaseJudge {
  // eslint-disable-next-line max-lines-per-function, complexity
  async evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: { replyWith: string } & Record<string, any>,
    context: JudgeContext,
  ): Promise<JudgeResult> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const metaWrapper = componentOf(this.constructor as Class);
    const meta = metaWrapper?.meta as JudgeMeta | undefined;

    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!meta || !meta.model || !meta.systemPrompt || !meta.metrics || !context.chatModel) {
      return { passed: true }; // No declarative rules or model provided
    }

    // Build Zod schema dynamically from metrics definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape: Record<string, any> = {};
    for (const [key, rule] of Object.entries(meta.metrics)) {
      if (rule.exact !== undefined) {
        if (typeof rule.exact === "boolean") shape[key] = z.boolean();
        else if (typeof rule.exact === "number") shape[key] = z.number();
        else shape[key] = z.any(); // fallback
      } else {
        shape[key] = z.number();
      }
    }
    const schema = z.object(shape);

    const modelWithStruct = context.chatModel.withStructuredOutput(schema);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let metricsResult: Record<string, any>;
    try {
      metricsResult = await modelWithStruct.invoke([
        new SystemMessage(meta.systemPrompt),
        new HumanMessage(state.replyWith),
      ]);
    } catch (e) {
      // eslint-disable-next-line no-console -- swallowed judge failure; becomes a typed error in #185
      console.error("Failed to execute declarative judge:", e);
      return { passed: false, feedback: "Internal judge failure." };
    }

    let allPassed = true;
    let combinedFeedback = "";

    for (const [key, rule] of Object.entries(meta.metrics)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const val = metricsResult[key];
      if (val === undefined) {
        allPassed = false;
        combinedFeedback += `- Missing metric '${key}'.
`;
        continue;
      }

      if (rule.exact !== undefined) {
        // Deep equal check for exact
        if (JSON.stringify(val) !== JSON.stringify(rule.exact)) {
          allPassed = false;
          combinedFeedback += `- ${rule.feedback}
`;
        }
      } else {
        if (rule.min !== undefined && (val as number) < rule.min) {
          allPassed = false;
          combinedFeedback += `- ${rule.feedback}
`;
        }
        if (rule.max !== undefined && (val as number) > rule.max) {
          allPassed = false;
          combinedFeedback += `- ${rule.feedback}
`;
        }
      }
    }

    return {
      passed: allPassed,
      feedback: allPassed ? undefined : combinedFeedback,
      metrics: metricsResult,
    };
  }
}
