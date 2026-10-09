import { describe, expect, it } from "vitest";
import { Agent, WorkflowAction, Workflow } from "../../src/components/decorators.js";
import { from, catchError } from "../../src/router/index.js";
import {
  WorkflowStart,
  WorkflowFinish,
  LocalSagaStrategy,
  WorkflowCancelledError,
} from "../../src/core/index.js";
import { testWith } from "../../src/testing/test-with.js";

const logs: string[] = [];

@WorkflowAction({ name: "cancel_payment_global" })
class CancelPaymentAction {
  async execute(state: any, ctx: any) {
    logs.push(`cancel_payment:${ctx.idempotencyKey}`);
    return { payload: { canceled: true } };
  }
}

@Agent({ name: "process_payment_global", compensate: CancelPaymentAction })
class ProcessPaymentAgent {
  async run() {
    logs.push("process_payment");
    return {};
  }
}

@Agent({ name: "slow_agent" })
class SlowAgent {
  async run() {
    logs.push("slow_agent");
    // Simulate a pause so we can cancel it
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
}

@Workflow({
  name: "cancellable_booking",
  version: "1.0",
  flow: [
    from(WorkflowStart).next(ProcessPaymentAgent),
    from(ProcessPaymentAgent).next(SlowAgent),
    from(SlowAgent).next(WorkflowFinish),
    // Catch global cancellation and rollback
    catchError(SlowAgent, WorkflowCancelledError).compensateWith(LocalSagaStrategy),
    from(LocalSagaStrategy).next(WorkflowFinish),
  ],
})
class CancellableBookingWorkflow {}

describe("Global Cancellation", () => {
  it("cancels execution and triggers rollback with idempotency keys", async () => {
    logs.length = 0; // reset
    await testWith(CancellableBookingWorkflow, async (app) => {
      // Mock ProcessPayment
      app.script(ProcessPaymentAgent, async () => {
        logs.push("process_payment");
        return { payload: {} };
      });

      // We will intercept the slow agent and cancel the app
      app.script(SlowAgent, async (req, res, state) => {
        logs.push("slow_agent_started");
        // We trigger the global cancel api while the agent is "running"
        await app.cancel(state.runId);
        // We throw so it fails and router catches it (simulating what the guard does if it hits on next tick)
        throw new WorkflowCancelledError();
      });

      const res = await app.run({});
      expect(res.status).toBe("completed"); // completes successfully because LocalSaga handles the error

      // Expected execution order:
      // 1. process_payment
      // 2. slow_agent_started -> triggers cancel -> throws CancelledError
      // 3. LocalSagaStrategy executes CancelPaymentAction

      expect(logs).toContain("process_payment");
      expect(logs).toContain("slow_agent_started");

      const cancelLog = logs.find((l) => l.startsWith("cancel_payment:"));
      expect(cancelLog).toBeDefined();
      expect(cancelLog).toMatch(/cancel_payment:run_.*_node_process_payment_global/);
    });
  });
});
