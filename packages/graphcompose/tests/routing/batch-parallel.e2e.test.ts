import { describe, expect, it } from "vitest";
import { from } from "../../src/graph/flow.js";
import { BatchParallelStrategy } from "../../src/concurrency/batch.decorator.js";
import { WorkflowStart, WorkflowFinish } from "../../src/graph/index.js";
import { checkFlow } from "../../src/graph/check-flow.js";
import { buildEdges } from "../../src/graph/build.js";
import { Agent } from "../../src/components/decorators.js";

@BatchParallelStrategy()
class NumberStrategy {
  extract() {
    return [1, 2, 3, 4, 5];
  }
}
@WorkflowStart({ name: "Start" })
class Start {}
@WorkflowFinish({ name: "Finish" })
class Finish {}
@Agent({ name: "Worker" })
class Worker {}
@Agent({ name: "Summary" })
class Summary {}

describe("BatchParallel (Scatter-Gather)", () => {
  it("should parse batchParallel options correctly into AST", () => {
    const flow = [
      from(Start).batchParallel(Worker, NumberStrategy, { concurrencyLimit: 2, batchSize: 2 }),
      from(Worker).next(Summary),
      from(Summary).next(Finish),
    ];

    const model = checkFlow(flow);
    const batchTransition = model.collected.transitions.find(
      (t) => t.next.kind === "batchParallel",
    );
    expect(batchTransition).toBeDefined();
    if (batchTransition?.next.kind === "batchParallel") {
      expect(batchTransition.next.options.concurrencyLimit).toBe(2);
      expect(batchTransition.next.options.batchSize).toBe(2);
    }
  });
});
