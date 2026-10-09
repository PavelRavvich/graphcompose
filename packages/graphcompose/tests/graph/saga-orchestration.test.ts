import { describe, expect, it, vi } from "vitest";
import { Agent, WorkflowAction, Workflow } from "../../src/components/decorators.js";
import { from, catchError } from "../../src/router/index.js";
import { WorkflowStart, WorkflowFinish, LocalSagaStrategy } from "../../src/core/index.js";
import { testWith } from "../../src/testing/test-with.js";

const logs: string[] = [];

@WorkflowAction({ name: "cancel_payment" })
class CancelPaymentAction {
  async execute() {
    logs.push("cancel_payment");
    return { payload: { canceled: true } };
  }
}

@WorkflowAction({ name: "cancel_hotel" })
class CancelHotelAction {
  async execute() {
    logs.push("cancel_hotel");
    return { payload: { hotel_canceled: true } };
  }
}

@Agent({ name: "book_hotel", compensate: CancelHotelAction })
class BookHotelAgent {
  async run() {
    logs.push("book_hotel");
    return {};
  }
}

@Agent({ name: "process_payment", compensate: CancelPaymentAction })
class ProcessPaymentAgent {
  async run() {
    logs.push("process_payment");
    return {};
  }
}

@Agent({ name: "book_flight" }) // Fails intentionally
class BookFlightAgent {
  async run() {
    throw new Error("Flight fully booked");
  }
}

@Workflow({
  name: "vacation_booking",
  version: "1.0",
  flow: [
    from(WorkflowStart).next(BookHotelAgent),
    from(BookHotelAgent).next(ProcessPaymentAgent),
    from(ProcessPaymentAgent).next(BookFlightAgent),
    // Route any error in book_flight to LocalSagaStrategy to trigger rollbacks
    catchError(BookFlightAgent, Error).compensateWith(LocalSagaStrategy),
    from(LocalSagaStrategy).next(WorkflowFinish)
  ]
})
class VacationBookingWorkflow {}

describe("Saga Orchestration", () => {
  it("executes compensators in reverse order upon failure", async () => {
    logs.length = 0; // reset
    await testWith(VacationBookingWorkflow, async (app) => {
      // Mock the agents to just execute and not actually call LLM
      app.script(BookHotelAgent, async () => {
        logs.push("book_hotel");
        return { payload: { step: 1 } };
      });
      app.script(ProcessPaymentAgent, async () => {
        logs.push("process_payment");
        return { payload: { step: 2 } };
      });
      app.script(BookFlightAgent, async () => {
        throw new Error("Flight fully booked");
      });

      const res = await app.run({});
      expect(res.status).toBe("completed");
      
      // Expected execution order:
      // 1. book_hotel
      // 2. process_payment
      // 3. Error in book_flight -> routed to LocalSagaStrategy
      // 4. LocalSagaStrategy finds book_hotel and process_payment in history
      // 5. Compensates in reverse: cancel_payment -> cancel_hotel
      
      expect(logs).toEqual([
        "book_hotel",
        "process_payment",
        "cancel_payment",
        "cancel_hotel"
      ]);
    });
  });
});
