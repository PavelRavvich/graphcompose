import { route } from "../../../src/graph/route.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { Self } from "../../../src/graph/flow.js";
import { testNode } from "./nodes.js";

@testNode("workflow-start", "start")
export class Start {}

@testNode("agent", "a")
export class A {}

@testNode("agent", "b")
export class B {}

@testNode("agent", "other-a")
export class OtherA {}

/** A second class claiming the name "a". */
@testNode("agent", "a")
export class AlsoNamedA {}

@testNode("workflow-finish", "done")
export class Done {}

@testNode("workflow-finish", "other-done")
export class OtherDone {}

/** Not a flow node (e.g. a tool or a channel). */
export class SomeTool {
  readonly kind = "tool";
}

const jev = "typesafe/jev-1.13";

@Router({
  name: "pick",
  description: "Picks A or B",
  instructions: "Pick.",
  model: jev,
  routes: [route("A").to(A), route("B").to(B)],
})
export class Pick {}

@Router({
  name: "gate",
  description: "Back or done",
  instructions: "Gate.",
  model: jev,
  maxVisits: 10,
  routes: [route("Again").to(Self), route("Finished").to(Done)],
})
export class Gate {}

@Router({
  name: "only",
  description: "One route",
  instructions: "Only.",
  model: jev,
  routes: [route("Finished").to(Done)],
})
export class Only {}

@Router({
  name: "second",
  description: "Done too",
  instructions: "Second.",
  model: jev,
  routes: [route("A").to(A), route("Finished").to(Done)],
})
export class Second {}

@Router({
  name: "mute", instructions: "",
  description: "No texts",
  model: jev,
  routes: [route("").to(Done), route("" ).to(A)],
})
export class Mute {}

/** A router that sends the turn back to A or finishes — no `maxVisits`. */
@Router({
  name: "loop",
  description: "A again or done",
  instructions: "Loop.",
  model: jev,
  routes: [route("A").to(A), route("Finished").to(Done)],
})
export class Loop {}

/** Two routers for one cycle (`Ping → A → Pong → B → Ping`) — no `maxVisits` on either. */
@Router({
  name: "ping",
  description: "A or done",
  instructions: "Ping.",
  model: jev,
  routes: [route("A").to(A), route("Finished").to(Done)],
})
export class Ping {}

@Router({
  name: "pong",
  description: "B or done",
  instructions: "Pong.",
  model: jev,
  routes: [route("B").to(B), route("Finished").to(Done)],
})
export class Pong {}

/** `Gate` without `maxVisits`: `Self` makes it a cycle with the agent before it. */
@Router({
  name: "unbounded-gate",
  description: "Back or done",
  instructions: "Gate.",
  model: jev,
  routes: [route("Again").to(Self), route("Finished").to(Done)],
})
export class UnboundedGate {}
