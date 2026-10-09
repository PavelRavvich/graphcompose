import { describe, expect, it } from "vitest";
import * as graph from "../../src/graph/index.js";
import * as units from "../../src/units/index.js";
describe("AC1: graphcompose/graph and graphcompose/units", () => {
  it("export the flow DSL, @WorkflowStart, @Router, @WorkflowFinish, settings and errors", () => {
    const expected = [
      "End",
      "GraphRuleError",
      "LimitExceededError",
      "Router",
      "RouterDecisionError",
      "SELF_OPTION",
      "Self",
      "Return",
      "WorkflowFinish",
      "WorkflowSettings",
      "WorkflowSettingsError",
      "WorkflowStart",
      "background",
      "bg",
      "chain",
      "from",
      "node",
      "optional",
      "parallel",
    ].sort();
    expect(Object.keys(graph).sort()).toEqual(expected);
  });
  it("export the unit helpers", () => {
    expect(Object.keys(units).sort()).toEqual(["UnitError", "minutes", "seconds", "usd"].sort());
  });
});
