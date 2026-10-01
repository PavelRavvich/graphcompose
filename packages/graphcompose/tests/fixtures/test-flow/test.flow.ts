import { WorkflowStartText, WorkflowFinishText } from "../../../src/dto/index.js";
import { WorkflowFinish } from "../../../src/graph/workflow-finish.decorator.js";
import { WorkflowStart } from "../../../src/graph/workflow-start.decorator.js";
import { from, type Flow } from "../../../src/graph/flow.js";
import { route } from "../../../src/graph/route.js";
import { Router } from "../../../src/graph/router.decorator.js";
import type { LoadedRouter } from "../../../src/graph/router-texts.js";
import { recordNode } from "../../../src/graph/node-kind.js";
import type { Class } from "../../../src/components/injection.js";

/** A bare agent node (the test config holds its settings). */
const agentNode =
  (name: string) =>
  <C extends Class>(value: C): C => {
    recordNode(value, { kind: "agent", name });
    return value;
  };

@WorkflowStart({ name: "chat", description: "A message from the user", input: WorkflowStartText })
export class TestChat {}

@agentNode("alpha")
export class Alpha {}

@agentNode("beta")
export class Beta {}

@WorkflowFinish({
  name: "answer",
  description: "The answer to the user",
  output: WorkflowFinishText,
})
export class TestAnswer {}

const ROUTES = {
  alpha: "Handles alpha work",
  beta: "Handles beta work",
  answer: "The contributions so far answer the task",
} as const;

/** The test workflows' main router: an LLM ("test/router") so tests script it with fake chat models. */
@Router({
  name: "main",
  description: "Sends the task to an agent, or sends the answer",
  prompt: "Pick who handles the task.",
  model: "test/router",
  maxVisits: 10,
  routes: [route(Alpha, ROUTES.alpha), route(Beta, ROUTES.beta), route(TestAnswer, ROUTES.answer)],
})
export class TestMain {}

/** The star: workflow start → main router → alpha / beta → main again → … → answer. */
export const testFlow: Flow = [
  from(TestChat).to(TestMain),
  from(TestMain).choose(Alpha, Beta, TestAnswer),
  from(Alpha, Beta).to(TestMain),
];

/** `TestMain` as assembly loads it (routes sorted by name). */
export const testRouters: readonly LoadedRouter[] = [
  {
    name: "main",
    description: "Sends the task to an agent, or sends the answer",
    model: "test/router",
    instructions: "Pick who handles the task.",
    routes: [
      { option: "alpha", text: ROUTES.alpha },
      { option: "answer", text: ROUTES.answer },
      { option: "beta", text: ROUTES.beta },
    ],
  },
];
