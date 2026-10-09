import { describe, expect, it } from "vitest";
import { Workflow, WorkflowAction } from "../../src/components/decorators.js";
import { from } from "../../src/graph/flow.js";
import { WorkflowGraphValidator, DependencyCycleError } from "../../src/graph/validator.js";
import { WorkflowStart } from "../../src/graph/workflow-start.decorator.js";
import { WorkflowFinish } from "../../src/graph/workflow-finish.decorator.js";
import { Subgraph } from "../../src/graph/subgraph.decorator.js";
import { componentOf } from "../../src/components/metadata.js";

class MockDto {}

@WorkflowStart({ name: "start", input: MockDto })
class StartNode {}

@WorkflowFinish({ name: "finish", output: MockDto })
class FinishNode {}

@WorkflowAction({ name: "dummy" })
class DummyAction {
  async execute() { return {}; }
}

@Workflow({
  name: "child",
  flow: [from(StartNode).next(DummyAction), from(DummyAction).next(FinishNode)]
})
class ChildWorkflow {}

@Subgraph({
  name: "child_subgraph",
  workflow: ChildWorkflow,
  start: StartNode,
  finish: FinishNode
})
class ChildSubgraph {}

@Workflow({
  name: "parent",
  flow: [from(StartNode).next(ChildWorkflow), from(ChildWorkflow).next(FinishNode)]
})
class ParentWorkflow {}

@Workflow({
  name: "parent_with_wrapper",
  flow: [from(StartNode).next(ChildSubgraph), from(ChildSubgraph).next(FinishNode)]
})
class ParentWithWrapperWorkflow {}

@Workflow({
  name: "cycle_a",
  flow: []
})
class CycleA {}

@Workflow({
  name: "cycle_b",
  flow: []
})
class CycleB {}

// Manually wire cycles since decorators execute once
const metaA = componentOf(CycleA);
const metaB = componentOf(CycleB);
if (metaA?.kind === "workflow" && metaB?.kind === "workflow") {
  Object.assign(metaA.meta, { flow: [from(StartNode).next(CycleB)] });
  Object.assign(metaB.meta, { flow: [from(StartNode).next(CycleA)] });
}

describe("Subgraph Cycle Validation", () => {
  it("allows acyclic workflow references", () => {
    const validator = new WorkflowGraphValidator();
    expect(() => validator.validateAcyclic(ParentWorkflow)).not.toThrow();
  });

  it("allows acyclic subgraph wrappers", () => {
    const validator = new WorkflowGraphValidator();
    expect(() => validator.validateAcyclic(ParentWithWrapperWorkflow)).not.toThrow();
  });

  it("detects cyclic workflow dependencies", () => {
    const validator = new WorkflowGraphValidator();
    expect(() => validator.validateAcyclic(CycleA)).toThrowError(DependencyCycleError);
  });
});
