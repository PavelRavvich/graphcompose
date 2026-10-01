import { chain, from, type Flow } from "../../../src/graph/flow.js";
import { route } from "../../../src/graph/route.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { testNode } from "./nodes.js";

@testNode("entry", "chat")
export class ChatEntry {}

@testNode("agent", "explainer")
export class ExplainerAgent {}

@testNode("agent", "coder")
export class CoderAgent {}

@testNode("agent", "reviewer")
export class ReviewerAgent {}

@testNode("conclusion", "answer")
export class AnswerConclusion {}

@testNode("conclusion", "pull-request")
export class PullRequestConclusion {}

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
  routes: [
    route(CoderAgent, "The review asks for changes"),
    route(PullRequestConclusion, "The review is clean"),
  ],
})
export class ReviewGateRouter {}

/** The code-review shape: entry → router → agents → gate router cycle → conclusions. */
export const codeReviewFlow: Flow = [
  from(ChatEntry).to(MainRouter),
  from(MainRouter).choose(ExplainerAgent, CoderAgent),
  from(ExplainerAgent).to(AnswerConclusion),
  chain(CoderAgent, ReviewerAgent, ReviewGateRouter),
  from(ReviewGateRouter).choose(CoderAgent, PullRequestConclusion),
];
