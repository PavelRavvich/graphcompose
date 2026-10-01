import { flowNodesByKey, runResultOf } from "../../src/app/result.js";
import type { App, RunResult } from "../../src/app/types.js";
import { untilDone, type Ask } from "../../src/cli/approve.js";
import { resumeAgent, runAgent, type RunDeps } from "../../src/index.js";
import type { TestAgent } from "../helpers.js";

/** A run in the terminal: asks about each paused call, resumes through an app-shaped `resume`. */
export async function inTerminal(deps: RunDeps<TestAgent>, ask: Ask): Promise<RunResult> {
  const nodes = flowNodesByKey(deps.flow);
  let current = await runAgent({ task: "Email the boss" }, deps);
  const app: Pick<App, "resume"> = {
    resume: async (_thread, decision) => {
      current = await resumeAgent(current, decision, deps);
      return runResultOf(current, nodes);
    },
  };
  return untilDone(runResultOf(current, nodes), app, ask);
}
