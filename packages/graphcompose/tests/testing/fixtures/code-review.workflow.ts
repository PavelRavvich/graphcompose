import { Agent, Injectable, MODEL_MAX, Workflow } from "../../../src/index.js";
import { WorkflowFinishText, WorkflowStartText } from "../../../src/dto/index.js";
import {
  chain,
  from,
  route,
  Router,
  WorkflowFinish,
  WorkflowStart,
  type WorkflowDefinition,
  WorkflowSettings,
} from "../../../src/graph/index.js";

const price = { inputPerMTok: 1, outputPerMTok: 2 };

@Agent({
  name: "coder",
  prompt: "./coder.prompt.md",
  description: "Writes the code",
  model: "test/coder",
  price,
})
export class Coder {}

@Agent({
  name: "reviewer",
  prompt: "./reviewer.prompt.md",
  description: "Reviews the code",
  model: "test/reviewer",
  price,
})
export class Reviewer {}

@WorkflowStart({ name: "task", description: "A coding task", input: WorkflowStartText })
export class TaskStart {}

@WorkflowFinish({ name: "pull-request", description: "The change", output: WorkflowFinishText })
export class PullRequest {}

@Router({
  name: "review-gate",
  description: "Sends the code back to the coder or opens the pull request",
  prompt: "Is the review clean?",
  model: "typesafe/jev-1.13",
  maxVisits: 3,
  routes: [
    { target: Coder, prompt: "The review asks for changes" },
    { target: PullRequest, prompt: "Stop and send the answer: the review is clean" },
  ],
})
export class ReviewGate {}

/** A class the workflow never uses (mockOf of it is a test setup error). */
@Injectable()
export class Unused {}

/** The code-review cycle: the gate sends the code back to the coder until the review is clean. */
@Workflow({
  name: "code-review",
  version: "1.0.0",
  flow: [
    from(TaskStart).next(Coder),
    chain(Coder, Reviewer, ReviewGate),
    from(ReviewGate).routeOne(Coder, PullRequest),
  ],
  defaults: {
    models: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
    router: { kind: "jev", model: "typesafe/jev-1.13" },
    tools: { maxToolCalls: 2 },
    history: { limit: 2 },
  },
})
export class CodeReview implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder().build();
  }
}
