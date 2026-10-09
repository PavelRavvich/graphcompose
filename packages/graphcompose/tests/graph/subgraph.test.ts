import { describe, expect, it } from "vitest";
import { Workflow, WorkflowAction } from "../../src/components/decorators.js";
import { from } from "../../src/graph/flow.js";
import { WorkflowGraphValidator, DependencyCycleError } from "../../src/graph/validator.js";
import { WorkflowStart } from "../../src/graph/workflow-start.decorator.js";
import { WorkflowFinish } from "../../src/graph/workflow-finish.decorator.js";
import { Subgraph } from "../../src/graph/subgraph.decorator.js";
import { componentOf } from "../../src/components/metadata.js";

/* eslint-disable */

class MockDto {
  text!: string;
}

const sharedDefaults = {
  version: "1.0.0",
  defaults: {
    models: { temperature: 0 },
    router: { model: "default" },
    history: { window: 10 },
  },
} as any;

@WorkflowStart({ name: "start", description: "start", input: MockDto })
class StartNode {}

@WorkflowFinish({ name: "finish", description: "finish", output: MockDto })
class FinishNode {}

@WorkflowAction({ name: "dummy" })
class DummyAction {
  async execute() {
    return {};
  }
}

@Workflow({
  name: "child",
  ...sharedDefaults,
  flow: [from(StartNode).next(DummyAction), from(DummyAction).next(FinishNode)],
})
class ChildWorkflow {
  settings(): any {
    return {} as any;
  }
}

@Subgraph({
  name: "child_subgraph",
  workflow: ChildWorkflow,
  start: StartNode,
  finish: FinishNode,
})
class ChildSubgraph {}

@Workflow({
  name: "parent",
  ...sharedDefaults,
  flow: [from(StartNode).next(ChildWorkflow), from(ChildWorkflow).next(FinishNode)],
})
class ParentWorkflow {
  settings(): any {
    return {} as any;
  }
}

@Workflow({
  name: "parent_with_wrapper",
  ...sharedDefaults,
  flow: [from(StartNode).next(ChildSubgraph), from(ChildSubgraph).next(FinishNode)],
})
class ParentWithWrapperWorkflow {
  settings(): any {
    return {} as any;
  }
}

@Workflow({
  name: "cycle_a",
  ...sharedDefaults,
  flow: [],
})
class CycleA {
  settings(): any {
    return {} as any;
  }
}

@Workflow({
  name: "cycle_b",
  ...sharedDefaults,
  flow: [],
})
class CycleB {
  settings(): any {
    return {} as any;
  }
}

const metaA = componentOf(CycleA);
const metaB = componentOf(CycleB);
if (metaA?.kind === "workflow" && metaB?.kind === "workflow") {
  Object.assign(metaA.meta, { flow: [from(StartNode).next(CycleB)] });
  Object.assign(metaB.meta, { flow: [from(StartNode).next(CycleA)] });
}

describe("Subgraph Cycle Validation", () => {
  it("allows acyclic workflow references", () => {
    const validator = new WorkflowGraphValidator();
    expect(() => {
      validator.validateAcyclic(ParentWorkflow);
    }).not.toThrow();
  });

  it("allows acyclic subgraph wrappers", () => {
    const validator = new WorkflowGraphValidator();
    expect(() => {
      validator.validateAcyclic(ParentWithWrapperWorkflow);
    }).not.toThrow();
  });

  it("detects cyclic workflow dependencies", () => {
    const validator = new WorkflowGraphValidator();
    expect(() => {
      validator.validateAcyclic(CycleA);
    }).toThrowError(DependencyCycleError);
  });
});
