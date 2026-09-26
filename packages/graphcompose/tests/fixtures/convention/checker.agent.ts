import { Agent } from "../../../src/index.js";
import { testConfig } from "../../helpers.js";

/** No prompt parameter: checker.prompt.md next to this file is used. */
@Agent({
  name: "checker",
  description: "Checks",
  model: "test/alpha",
  price: testConfig.agents.alpha.price,
})
export class CheckerAgent {}

/** Another file, relative to this one. */
@Agent({
  name: "custom",
  description: "Custom",
  model: "test/alpha",
  price: testConfig.agents.alpha.price,
  prompt: "./custom.md",
})
export class CustomAgent {}

/** Points at a file that is not there. */
@Agent({
  name: "lost",
  description: "Lost",
  model: "test/alpha",
  price: testConfig.agents.alpha.price,
  prompt: "./nope.md",
})
export class LostAgent {}
