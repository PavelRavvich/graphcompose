import { Workflow, WorkflowStart, WorkflowFinish, Agent, catchError } from "graphcompose";

export class InsufficientFundsError extends Error {}
export class TimeoutError extends Error {}

@Agent({ name: "cancel_flight" })
export class CancelFlightAgent {
  async run() {
    console.log("Canceling flight...");
    return {};
  }
}

@Agent({ name: "book_flight", compensate: CancelFlightAgent })
export class BookFlightAgent {
  async run() {
    throw new TimeoutError("Flight API down");
  }
}

@Agent({ name: "fallback_agent" })
export class FallbackAgent {
  async run() {
    return { payload: { recovered: true } };
  }
}

@Workflow({
  name: "trip_booking",
  version: "1.0",
  flow: [
    from(WorkflowStart).next(BookFlightAgent),
    
    // 1. Specific Error Routing
    catchError(BookFlightAgent, TimeoutError).next(FallbackAgent),
    
    // 2. Global/Saga Fallback
    catchError(BookFlightAgent, "any").next(SagaOrchestrator),
    
    from(FallbackAgent).next(WorkflowFinish)
  ]
})
export class TripBookingWorkflow {}
