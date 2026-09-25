import { Agent } from "../../../components/index.js";
import { CurrentTime } from "../../../tools/index.js";
import { KIMI, KIMI_PRICE } from "../../shared.js";

@Agent({
  name: "researcher",
  description: "Finds, explains and summarizes facts",
  model: KIMI,
  price: KIMI_PRICE,
  tools: [CurrentTime],
  prompt: new URL("./researcher.prompt.md", import.meta.url),
})
export class Researcher {}
