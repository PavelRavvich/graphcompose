import { flowNodesByKey, runResultOf } from "../../src/app/result.js";
import { untilDone } from "../../src/cli/approve.js";
import { resumeAgent, runAgent } from "../../src/index.js";
/** A run in the terminal: asks about each paused call, resumes through an app-shaped `resume`. */
export async function inTerminal(deps, ask) {
  const nodes = flowNodesByKey(deps.flow);
  let current = await runAgent({ task: "Email the boss" }, deps);
  const app = {
    resume: async (_thread, decision) => {
      current = await resumeAgent(current, decision, deps);
      return runResultOf(current, nodes);
    },
  };
  return untilDone(runResultOf(current, nodes), app, ask);
}
