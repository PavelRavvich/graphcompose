import { Agent } from "../../../components/index.js";
import { KIMI, KIMI_PRICE } from "../../shared.js";

@Agent({
  name: "coder",
  description: "Writes, reviews and explains code",
  model: KIMI,
  price: KIMI_PRICE,
  temperature: 0.2,
  thinking: "low",
  reasoning: { threshold: 0.8, maxAttempts: 3, thinking: ["low", "medium", "high"] },
  prompt: new URL("./coder.prompt.md", import.meta.url),
})
export class Coder {}
