import { describe, expect, it } from "vitest";
import { Agent, Workflow } from "../../src/components/decorators.js";
import { from } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/core/index.js";
import { testWith } from "../../src/testing/test-with.js";

@Agent({ name: "subgraph_agent" })
class SubgraphAgent {
  async run() {
    return { payload: { insideSubgraph: true } };
  }
}

@Workflow({
  name: "child_workflow",
  version: "1.0",
  flow: [
    from(WorkflowStart).next(SubgraphAgent),
    from(SubgraphAgent).next(WorkflowFinish)
  ],
  defaults: { history: { limit: 5 } }
})
class ChildWorkflow {}

@Agent({ name: "parent_agent" })
class ParentAgent {
  async run() {
    return { payload: { inParent: true } };
  }
}

@Workflow({
  name: "parent_workflow",
  version: "1.0",
  flow: [
    from(WorkflowStart).next(ParentAgent),
    from(ParentAgent).next(ChildWorkflow),
    from(ChildWorkflow).next(WorkflowFinish)
  ],
  defaults: { history: { limit: 5 } }
})
class ParentWorkflow {}

describe("Nested Workflows (Subgraphs)", () => {
  it("executes subgraph and merges payload", async () => {
    await testWith(ParentWorkflow, async (app) => {
      const res = await app.run({});
      expect(res.status).toBe("completed");
      
      const path = res.path;
      // start -> parent_agent -> child_workflow -> finish
      expect(path).toContain("parent_agent");
      expect(path).toContain("child_workflow");
      
      // Payload should merge
      expect(res.replyWith.payload).toMatchObject({
        inParent: true,
        insideSubgraph: true
      });
      
      // Steps should include the subgraph's steps!
      expect(res.path.length).toBeGreaterThan(0);
    });
  });
});
