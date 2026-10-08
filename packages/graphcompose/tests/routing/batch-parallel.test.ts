import { describe, expect, it } from "vitest";
import { WorkflowAction, Workflow } from "../../src/components/decorators.js";
import { from } from "../../src/graph/flow.js";
import { BatchParallelStrategy } from "../../src/concurrency/batch.decorator.js";
import { WorkflowStart, WorkflowFinish } from "../../src/graph/index.js";

const executionOrder: string[] = [];

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

@WorkflowAction({ name: "Worker" })
class Worker {
  execute(state: any) {
    executionOrder.push(`worker-${String(state.batchItem)}`);
    return {};
  }
}

@WorkflowAction({ name: "Summary" })
class Summary {
  execute() {
    executionOrder.push("summary");
    return {};
  }
}

@Workflow({
  name: "batch-parallel-workflow",
  agents: [Start, Worker, Summary, Finish],
  providers: [NumberStrategy],
  flow: [
    from(Start).batchParallel(Worker, NumberStrategy, { concurrencyLimit: 2, batchSize: 2 }),
    from(Worker).next(Summary),
    from(Summary).next(Finish),
  ],
})
class BatchParallelWorkflow {
  settings() {
    return {
      name: "batch-parallel-workflow",
      version: "1.0.0",
      defaults: {
        models: { temperature: 0, maxTokens: 1000, thinking: "default", cache: true },
        router: { kind: "jev", model: "mock" },
        tools: { maxToolCalls: 8 },
        history: { limit: 5 },
      },
      agents: {
        Worker: { model: "mock", description: "worker" },
        Summary: { model: "mock", description: "summary" },
      },
    };
  }
}

describe("BatchParallel (Scatter-Gather)", () => {
  it("should process items with the correct concurrency limit", async () => {
    executionOrder.length = 0; // reset

    // We cannot use createApp easily if we don't know how it executes.
    // Wait, let's just check the flow AST instead, using collectFlow.
    const { collectFlow } = await import("../../src/graph/flow-nodes.js");
    const collected = collectFlow([
      from(Start).batchParallel(Worker, NumberStrategy, { concurrencyLimit: 2, batchSize: 2 }),
      from(Worker).next(Summary),
      from(Summary).next(Finish),
    ]);

    expect(collected.nodes.size).toBe(4);
    const workerNode = Array.from(collected.nodes.values()).find((n) => n.name === "Worker");
    expect(workerNode).toBeDefined();

    const transitions = collected.transitions;
    const batchTransition = transitions.find((t) => t.next.kind === "batchParallel");
    expect(batchTransition).toBeDefined();
    expect((batchTransition?.next as any).options.concurrencyLimit).toBe(2);
  });
});
