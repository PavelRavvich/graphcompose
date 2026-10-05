import { route } from "../../../src/graph/index.js";

import type { Class } from "../../../src/components/injection.js";
import { from, type Flow } from "../../../src/graph/flow.js";
import { Router } from "../../../src/graph/router.decorator.js";
import { WorkflowSettings, type WorkflowDefinition } from "../../../src/graph/settings.js";
import { TestAnswer, TestChat } from "./test.flow.js";

/**
 * A star flow over the given agents (test workflows): chat workflow start → a Jev router "main" → an agent →
 * back to the router → … → answer.
 */
export function starOf(...agents: readonly [Class, ...Class[]]): Flow {
  @Router({
    name: "main",
    description: "Sends the message to an agent, or sends the answer",
    instructions: "Pick who handles the message.",
    model: "typesafe/jev-1.13",
    maxVisits: 10,
    routes: [
      route("The answer covers the message").to(TestAnswer),
      ...agents.map((agent) => route(`${agent.name} work`).to(agent)),
    ],
  })
  class Main {}
  return [
    from(TestChat).next(Main),
    from(Main).routeOne(...agents, TestAnswer),
    from(...agents).next(Main),
  ];
}

/** `settings()` of a test workflow without limits of its own (steps by default). */
export class TestSettings implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder().build();
  }
}
