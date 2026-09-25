import { Agent } from "../../../components/index.js";
import { KIMI, KIMI_PRICE } from "../../../bundles/shared.js";
import { ReadResume } from "../tools/read-resume.js";

@Agent({
  name: "profiler",
  description:
    "Reads the user's resume, interviews them about the jobs they want and agrees a search brief",
  model: KIMI,
  price: KIMI_PRICE,
  tools: [ReadResume],
  prompt: new URL("./profiler.prompt.md", import.meta.url),
})
export class Profiler {}
