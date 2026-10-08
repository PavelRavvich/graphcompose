import { describe, expect, it } from "vitest";
import { Agent, Workflow } from "../../src/components/decorators.js";
import { from, catchError } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish } from "../../src/core/index.js";
import { testWith } from "../../src/testing/test-with.js";

class MockTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockTimeoutError";
  }
}

@Agent({ name: "cancel_flight" })
class CancelFlightAgent {
  async run() {
    return { payload: { canceled: true } };
  }
}

@Agent({ name: "book_flight", compensate: CancelFlightAgent })
class BookFlightAgent {
  async run() {
    throw new MockTimeoutError("Flight API down");
  }
}

@Agent({ name: "fallback_agent" })
class FallbackAgent {
  async run() {
    return { payload: { recovered: true } };
  }
}

@Workflow({
  name: "trip_booking",
  version: "1.0",
  flow: [
    from(WorkflowStart).next(BookFlightAgent),
    catchError(BookFlightAgent, MockTimeoutError).next(FallbackAgent),
    catchError(BookFlightAgent, Error).next(WorkflowFinish),
    from(FallbackAgent).next(WorkflowFinish),
  ],
  defaults: { history: { limit: 5 } },
})
class TripBookingWorkflow {}

describe("Saga and Error Routing", () => {
  it("routes to WorkflowFinish on generic error", async () => {
    await testWith(TripBookingWorkflow, async (app) => {
      app.script(BookFlightAgent, async () => {
        throw new Error("Database down");
      });

      const res = await app.run({});
      expect(res.status).toBe("completed");

      const path = res.path;
      expect(path).toContain("book_flight");
      expect(path).not.toContain("fallback_agent");
    });
  });

  it("routes to fallback on specific error", async () => {
    await testWith(TripBookingWorkflow, async (app) => {
      app.script(FallbackAgent, async () => ({ payload: { recovered: true } }));

      const res = await app.run({});
      expect(res.status).toBe("completed");

      const path = res.path;
      expect(path).toContain("book_flight");
      expect(path).toContain("fallback_agent");
    });
  });
});
