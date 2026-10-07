import { describe, it, expect } from "vitest";
import { Workflow, Agent, Tool } from "../../../src/components/decorators.js";
import { from } from "../../../src/router/index.js";
import { type WorkflowDefinition } from "../../../src/core/index.js";
import { testWith } from "../../../src/testing/test-with.js";
import { QuorumRouter } from "../../../src/concurrency/quorum.decorator.js";
import { ComponentScript } from "../../../src/testing/script-book.js";
import { z } from "zod";

@Tool({ name: "slow_tool", description: "A slow tool", input: z.object({}), output: z.object({}) })
class SlowTool { run = async () => { await new Promise(resolve => setTimeout(resolve, 50)); return {}; }; }

@Tool({ name: "fast_tool", description: "A fast tool", input: z.object({}), output: z.object({}) })
class FastTool { run = async () => { return {}; }; }

@Agent({ name: "fast_agent", prompt: "You are fast", tools: [FastTool] })
class FastAgent {}

@Agent({ name: "slow_agent", prompt: "You are slow", tools: [SlowTool] })
class SlowAgent {}

@QuorumRouter({ name: "quorum_router", min: 1, filterVote: (state: any) => true })
class MyQuorumRouter {}

@Workflow({
  name: "quorum-test",
  version: "1.0.0",
  flow: [
    from("workflow_start").nextParallel(FastAgent, SlowAgent),
    from(FastAgent, SlowAgent).joinQuorum(MyQuorumRouter).routes("workflow_finish"),
  ]
})
class QuorumTestWorkflow implements WorkflowDefinition {}

describe("QuorumRouter", () => {
  it("aborts the slower branch when the quorum is met, saving an LLM call", async () => {
    await testWith(QuorumTestWorkflow, async (app) => {
      // Script FastAgent to finish immediately
      app.script(FastAgent, ComponentScript.turns([{}]));
      
      // Script SlowAgent to finish, but it shouldn't be called because it is aborted!
      // If the runtime didn't abort it, it would throw script exhausted.
      app.script(SlowAgent, ComponentScript.turns([{}]).delay(100));

      const run = await app.run("Hello");
      expect(run.status).toBe("finished");
    });
  });
});
