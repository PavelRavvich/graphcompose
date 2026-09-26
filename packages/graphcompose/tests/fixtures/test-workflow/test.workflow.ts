import { z } from "zod";
import { Agent, MODEL_MAX, Tool, Workflow, type ToolHandler } from "../../../src/index.js";

const price = { inputPerMTok: 0.5, outputPerMTok: 3, cacheReadPerMTok: 0.1 };
const In = z.object({
  timeZone: z.string().default("UTC").describe("IANA time zone, e.g. Asia/Tokyo"),
});
const Out = z.object({ iso: z.string(), timeZone: z.string() });
type ClockQuery = z.infer<typeof In>;
type ClockTime = z.infer<typeof Out>;

/** A test tool: the time, from an injected clock. */
@Tool({
  name: "current_time",
  description: "Current date and time in an IANA time zone (default UTC).",
  input: In,
  output: Out,
})
export class Clock implements ToolHandler<ClockQuery, ClockTime> {
  constructor(private readonly now: () => Date = () => new Date("2026-09-25T10:00:00Z")) {}
  run({ timeZone }: z.output<typeof In>): Promise<z.output<typeof Out>> {
    // an unknown time zone throws — the model sees it as a tool error
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(this.now());
    return Promise.resolve({ iso: this.now().toISOString(), timeZone });
  }
}

@Agent({
  name: "researcher",
  description: "Finds, explains and summarizes facts",
  model: "test/researcher",
  price,
  tools: [Clock],
  prompt: "./researcher.prompt.md",
})
export class Researcher {}

@Agent({
  name: "coder",
  description: "Writes, reviews and explains code",
  model: "test/coder",
  price,
  thinking: "low",
  reasoning: { threshold: 0.8, maxAttempts: 3, thinking: ["low", "medium", "high"] },
  prompt: "./coder.prompt.md",
})
export class Coder {}

/** The framework's own test workflow (the framework ships no agents). */
@Workflow({
  name: "test-workflow",
  version: "1.0.0",
  defaults: {
    chat: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
    router: { kind: "jev", model: "typesafe/jev-1.13" },
    tools: { maxToolCalls: 8 },
    history: { limit: 5 },
  },
  budget: { runBudgetCap: 0.05, dailyBudgetCap: 2, evalBudgetCap: 1 },
  routers: { main: { maxHops: 3 } },
  guards: {
    input: { prompt_injection: { threshold: 0.7, refusal: "I can't help with that request." } },
    output: { pii: { threshold: 0.7, refusal: "Withheld." } },
  },
  agents: [Researcher, Coder],
})
export class TestWorkflow {}
