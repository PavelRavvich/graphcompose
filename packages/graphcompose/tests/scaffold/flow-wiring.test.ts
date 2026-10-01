import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ScaffoldError } from "../../src/scaffold/errors.js";
import { planGenerate } from "../../src/scaffold/generate.js";
import { addAgentToFlow } from "../../src/scaffold/wire-flow.js";

const workflow = (flow: string) => ({ path: "src/desk/desk.workflow.ts", content: flow });

describe("#116: gc g agent joins the star; gc g router", () => {
  it("adds the agent before the answer in choose(...) and to the agents going back to the router", () => {
    const file = workflow(
      "flow: [\n  from(ChatEntry).to(MainRouter),\n  from(MainRouter).choose(TriageAgent, AnswerConclusion),\n  from(TriageAgent).to(MainRouter),\n]",
    );

    expect(addAgentToFlow(file, "BillingAgent", "MainRouter").content).toBe(
      "flow: [\n  from(ChatEntry).to(MainRouter),\n  from(MainRouter).choose(TriageAgent, BillingAgent, AnswerConclusion),\n  from(TriageAgent, BillingAgent).to(MainRouter),\n]",
    );
  });

  it("a choice with one target gets the agent first", () => {
    const file = workflow(
      "[from(MainRouter).choose(AnswerConclusion), from(TriageAgent).to(MainRouter)]",
    );

    expect(addAgentToFlow(file, "BillingAgent", "MainRouter").content).toBe(
      "[from(MainRouter).choose(BillingAgent, AnswerConclusion), from(TriageAgent, BillingAgent).to(MainRouter)]",
    );
  });

  it("an unexpected flow is not guessed: an error naming the file", () => {
    const file = workflow(
      "[from(ChatEntry).to(TriageAgent), from(TriageAgent).to(AnswerConclusion)]",
    );

    expect(() => addAgentToFlow(file, "BillingAgent", "MainRouter")).toThrow(ScaffoldError);
    expect(() => addAgentToFlow(file, "BillingAgent", "MainRouter")).toThrow(
      "src/desk/desk.workflow.ts: no from(MainRouter).choose(…)",
    );
  });

  it("gc g router needs the workflow's answer conclusion, and creates the router with its answer route", () => {
    const root = mkdtempSync(join(tmpdir(), "gc-router-"));
    mkdirSync(join(root, "src/desk"), { recursive: true });
    writeFileSync(join(root, "src/desk/desk.workflow.ts"), "");
    const options = { workflow: "src/desk/desk.workflow.ts" };

    expect(() => planGenerate("router", "escalation", options, root)).toThrow(
      "Not found: src/desk/conclusions/answer.conclusion.ts",
    );
    mkdirSync(join(root, "src/desk/conclusions"));
    writeFileSync(join(root, "src/desk/conclusions/answer.conclusion.ts"), "");
    const [router] = planGenerate("router", "escalation", options, root).create;
    expect(router?.path).toBe("src/desk/routers/escalation.router.ts");
    expect(router?.content).toContain("export class EscalationRouter {}");
    expect(router?.content).toContain(
      'route(AnswerConclusion, "Stop and send the answer: the contributions so far answer',
    );
  });
});
