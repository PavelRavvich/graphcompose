import { extractText } from "./multimodal-utils.js";
import { z } from "zod";
import { ZERO_USAGE } from "../finops/usage.js";
import { decided, errorReason, failed, unknownOption } from "./outcome.js";
import { jevRouteInstructions } from "./prompts.js";
import { routerCaller } from "./types.js";
const JevResponseSchema = z.object({
  model: z.string().optional(),
  answers: z.object({
    route: z.object({
      choice: z.string(),
      confidence: z.number().optional(),
      probabilities: z.record(z.string(), z.number()).optional(),
    }),
  }),
  usage: z.object({ cost: z.number().optional(), total_cost: z.number().optional() }).optional(),
});
const reportedCost = (usage) => usage?.cost ?? usage?.total_cost ?? 0;
const scoreOf = (route) => route.probabilities?.[route.choice] ?? route.confidence;
function reasonFor(score) {
  return score === undefined ? "jev" : `jev confidence ${score.toFixed(2)}`;
}
function toOutcome(raw, request, usageOf) {
  const parsed = JevResponseSchema.safeParse(raw);
  if (!parsed.success) return failed("invalid router output", usageOf(undefined, 0));
  const { answers, usage, model } = parsed.data;
  const record = usageOf(model, reportedCost(usage));
  const { route } = answers;
  if (!request.options.some((option) => option.name === route.choice)) {
    return unknownOption(route.choice, record);
  }
  const score = scoreOf(route);
  const decision = { next: route.choice, reason: reasonFor(score) };
  return decided(score === undefined ? decision : { ...decision, confidence: score }, record);
}
/** Jev picks among options with calibrated probabilities; cost comes from the API response. */
export function createJevRouter(deps) {
  const usageOf = (reportedModel, costUsd) => ({
    caller: routerCaller(deps.name),
    model: reportedModel ?? deps.model,
    ...ZERO_USAGE,
    costUsd,
    costSource: "api",
  });
  return {
    name: deps.name,
    route: async (request) => {
      const criteria = Object.fromEntries(request.options.map((o) => [o.name, o.description]));
      try {
        const raw = await deps.client({
          model: deps.model,
          state: extractText(request.input),
          questions: {
            route: {
              type: "choice",
              instructions: request.instructions ?? jevRouteInstructions,
              criteria,
            },
          },
        });
        return toOutcome(raw, request, usageOf);
      } catch (error) {
        return failed(errorReason(error), usageOf(undefined, 0));
      }
    },
  };
}
