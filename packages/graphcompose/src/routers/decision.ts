import { z } from "zod";
import type { RouterDecision } from "./types.js";

const DecisionSchema = z.object({ next: z.string(), reason: z.string().default("") });
const CODE_FENCE = /^```(?:json)?\s*|\s*```$/g;

function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

/** Validates raw LLM router output. Returns undefined for anything not a known option. */
export function parseRouterDecision(
  text: string,
  allowedOptions: ReadonlySet<string>,
): RouterDecision | undefined {
  const parsed = DecisionSchema.safeParse(parseJson(text.trim().replace(CODE_FENCE, "")));
  if (!parsed.success || !allowedOptions.has(parsed.data.next)) return undefined;
  return parsed.data;
}
