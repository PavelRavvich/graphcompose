import { describe, expect, it } from "vitest";
import * as graph from "../../src/graph/index.js";
import * as units from "../../src/units/index.js";

describe("AC1: graphcompose/graph and graphcompose/units", () => {
  it("export the flow DSL, @WorkflowStart, @Router, @WorkflowFinish, settings and errors", () => {
    expect(Object.keys(graph).sort()).toEqual([
      "GraphRuleError",
      "LimitExceededError",
      "Router",
      "RouterDecisionError",
      "Self",
      "WorkflowFinish",
      "WorkflowSettings",
      "WorkflowSettingsError",
      "WorkflowStart",
      "chain",
      "from",
      "node",
      "route",
    ]);
  });

  it("export the unit helpers", () => {
    expect(Object.keys(units).sort()).toEqual(["UnitError", "minutes", "seconds", "usd"]);
  });
});
