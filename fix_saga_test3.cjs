const fs = require("fs");
const file = "packages/graphcompose/tests/graph/saga.test.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(
  /    await testWith\(TripBookingWorkflow, async \(app\) => \{/g,
  `
  it("routes to WorkflowFinish on generic error", async () => {
    await testWith(TripBookingWorkflow, async (app) => {
      app.script(BookFlightAgent, async () => { throw new Error("Database down"); });
      
      const res = await app.run({});
      expect(res.status).toBe("completed");
      
      const path = res.path;
      // start -> book -> finish (bypassing fallback)
      expect(path).toContain("book_flight");
      expect(path).not.toContain("fallback_agent");
    });
  });

  it("routes to fallback on specific error", async () => {
    await testWith(TripBookingWorkflow, async (app) => {`,
);

fs.writeFileSync(file, code);
