import { Bundle } from "../../components/index.js";
import { BUDGET, DEFAULTS, GUARDS, ROUTERS } from "../shared.js";
import { Coder } from "./agents/coder.js";
import { Researcher } from "./agents/researcher.js";

/** The project's own agents. Add an agent: a class in agents/ + its prompt file, listed here. */
@Bundle({
  name: "research-coder",
  version: "1.1.0",
  defaults: DEFAULTS,
  budget: BUDGET,
  routers: ROUTERS,
  guards: GUARDS,
  agents: [Researcher, Coder],
})
export class ResearchCoder {}
