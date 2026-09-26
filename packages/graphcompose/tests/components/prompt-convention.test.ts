import { describe, expect, it } from "vitest";
import { Workflow, workflowOf, type Class } from "../../src/index.js";
import { CheckerAgent, CustomAgent, LostAgent } from "../fixtures/convention/checker.agent.js";
import { testConfig } from "../helpers.js";

const base = {
  version: "1.0.0",
  defaults: testConfig.defaults,
  budget: testConfig.budget,
  routers: testConfig.routers,
};
const workflowWith = (agent: Class): Class => {
  @Workflow({ ...base, name: "conventions", agents: [agent] })
  class Conventions {}
  return Conventions;
};

describe("the prompt next to its agent, like templateUrl (#107)", () => {
  it("AC1: no prompt parameter — <name>.prompt.md next to <name>.agent.ts", async () => {
    const { prompts } = await workflowOf(workflowWith(CheckerAgent));

    expect(prompts.checker?.trim()).toBe("You check things by convention.");
  });

  it("AC1: prompt picks another file, relative to the agent's file", async () => {
    expect((await workflowOf(workflowWith(CustomAgent))).prompts.custom?.trim()).toBe(
      "A prompt with another name.",
    );
  });

  it("AC1: a missing prompt names the agent and the path looked for", async () => {
    await expect(workflowOf(workflowWith(LostAgent))).rejects.toThrow(
      /@Agent "lost": prompt file not found: .*fixtures\/convention\/nope\.md/,
    );
  });
});
