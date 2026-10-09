import { z } from "zod";
const DecisionSchema = z.object({ next: z.string(), reason: z.string().default("") });
const CODE_FENCE = /^```(?:json)?\s*|\s*```$/g;
function parseJson(text) {
  try {
    const value = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}
/** Reads raw LLM router output; only a known option is a valid decision. */
export function readRouterDecision(text, allowedOptions) {
  const parsed = DecisionSchema.safeParse(parseJson(text.trim().replace(CODE_FENCE, "")));
  if (!parsed.success) return { kind: "invalid" };
  if (!allowedOptions.has(parsed.data.next))
    return { kind: "unknown-option", option: parsed.data.next };
  return { kind: "valid", decision: parsed.data };
}
