import { chain, from, type Flow } from "../../../src/graph/flow.js";
import { route } from "../../../src/graph/route.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { testNode } from "./nodes.js";

@testNode("workflow-start", "chat")
export class ChatWorkflowStart {}

@testNode("agent", "explainer")
export class ExplainerAgent {}

@testNode("agent", "coder")
export class CoderAgent {}

@testNode("agent", "reviewer")
export class ReviewerAgent {}

@testNode("workflow-finish", "answer")
export class AnswerWorkflowFinish {}

@testNode("workflow-finish", "pull-request")
export class PullRequestWorkflowFinish {}

@Router({
  name: "main",
  description: "Sends the message to the right agent",
  prompt: "Pick who handles the message.",
  model: "typesafe/jev-1.13",
  routes: [route(ExplainerAgent, "Explaining code"), route(CoderAgent, "Writing code")],
})
export class MainRouter {}

@Router({
  name: "review-gate",
  description: "Sends the code back or opens the pull request",
  prompt: "Is the review clean?",
  model: "typesafe/jev-1.13",
  maxVisits: 3,
  routes: [
    route(CoderAgent, "The review asks for changes"),
    route(PullRequestWorkflowFinish, "The review is clean"),
  ],
})
export class ReviewGateRouter {}

/** The code-review shape: workflow start → router → agents → gate router cycle → workflow finishes. */
export const codeReviewFlow: Flow = [
  from(ChatWorkflowStart).to(MainRouter),
  from(MainRouter).choose(ExplainerAgent, CoderAgent),
  from(ExplainerAgent).to(AnswerWorkflowFinish),
  chain(CoderAgent, ReviewerAgent, ReviewGateRouter),
  from(ReviewGateRouter).choose(CoderAgent, PullRequestWorkflowFinish),
];
