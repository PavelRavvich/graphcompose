import type { Class } from "../../../src/components/injection.js";
import { from, type Flow } from "../../../src/graph/flow.js";
import { route } from "../../../src/graph/route.js";
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
    prompt: "Pick who handles the message.",
    model: "typesafe/jev-1.13",
    maxVisits: 10,
    routes: [
      route(TestAnswer, "The answer covers the message"),
      ...agents.map((agent) => route(agent, `${agent.name} work`)),
    ],
  })
  class Main {}
  return [
    from(TestChat).to(Main),
    from(Main).choose(...agents, TestAnswer),
    from(...agents).to(Main),
  ];
}

/** `settings()` of a test workflow without limits of its own (steps by default). */
export class TestSettings implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder().build();
  }
}
