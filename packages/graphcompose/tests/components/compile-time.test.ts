/**
 * AC3 (#87): these mistakes are compile errors. `make check` runs `tsc`; an `@ts-expect-error` whose
 * line compiles would itself fail the build — so every line below must stay an error.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Agent, InjectionToken, Tool, type ToolHandler } from "../../src/components/index.js";
import { testConfig } from "../helpers.js";

class Judge {
  readonly judge = true;
}
const SEARCH = new InjectionToken<{ boards: string[] }>("SEARCH");
const In = z.object({ q: z.string() });
const Out = z.string();

@Tool({ name: "ok", description: "d", input: In, output: Out, deps: [Judge, SEARCH] })
class Ok implements ToolHandler<typeof In, typeof Out> {
  constructor(
    readonly judge: Judge,
    readonly search: { boards: string[] },
  ) {}
  run(): Promise<string> {
    return Promise.resolve("");
  }
}

// @ts-expect-error — deps in the wrong order
@Tool({ name: "swapped", description: "d", input: In, output: Out, deps: [SEARCH, Judge] })
class Swapped implements ToolHandler<typeof In, typeof Out> {
  constructor(
    readonly judge: Judge,
    readonly search: { boards: string[] },
  ) {}
  run(): Promise<string> {
    return Promise.resolve("");
  }
}

// @ts-expect-error — a dependency missing from deps
@Tool({ name: "missing", description: "d", input: In, output: Out, deps: [Judge] })
class Missing implements ToolHandler<typeof In, typeof Out> {
  constructor(
    readonly judge: Judge,
    readonly search: { boards: string[] },
  ) {}
  run(): Promise<string> {
    return Promise.resolve("");
  }
}

// @ts-expect-error — run returns what the output schema does not allow
@Tool({ name: "wrong-output", description: "d", input: In, output: Out })
class WrongOutput {
  run(): Promise<number> {
    return Promise.resolve(1);
  }
}

/** Type-checked, never run: at runtime the missing name would be a ReferenceError. */
function usesMissing(): unknown {
  @Agent({
    name: "a",
    description: "d",
    model: "m",
    price: testConfig.agents.alpha.price,
    // @ts-expect-error — a component that is not imported / does not exist
    tools: [NotImported],
    prompt: "./x.md",
  })
  class UsesMissing {}
  return UsesMissing;
}

describe("components — compile-time checks", () => {
  it("AC3: the file above type-checks only because each mistake is a compile error", () => {
    expect([Ok, Swapped, Missing, WrongOutput, usesMissing]).toHaveLength(5);
  });
});
