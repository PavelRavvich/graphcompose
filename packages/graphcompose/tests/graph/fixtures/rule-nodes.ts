import { route } from "../../../src/graph/route.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { Self } from "../../../src/graph/flow.js";
import { testNode } from "./nodes.js";

@testNode("entry", "start")
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

@testNode("conclusion", "done")
export class Done {}

@testNode("conclusion", "other-done")
export class OtherDone {}

/** Not a flow node (e.g. a tool or a channel). */
export class SomeTool {
  readonly kind = "tool";
}

const jev = "typesafe/jev-1.13";

@Router({
  name: "pick",
  description: "Picks A or B",
  prompt: "Pick.",
  model: jev,
  routes: [route(A, "A"), route(B, "B")],
})
export class Pick {}

@Router({
  name: "gate",
  description: "Back or done",
  prompt: "Gate.",
  model: jev,
  routes: [route(Self, "Again"), route(Done, "Finished")],
})
export class Gate {}

@Router({
  name: "only",
  description: "One route",
  prompt: "Only.",
  model: jev,
  routes: [route(Done, "Finished")],
})
export class Only {}

@Router({
  name: "second",
  description: "Done too",
  prompt: "Second.",
  model: jev,
  routes: [route(A, "A"), route(Done, "Finished")],
})
export class Second {}

@Router({
  name: "mute",
  description: "No texts",
  model: jev,
  routes: [route(Done, ""), route(A, {})],
})
export class Mute {}
