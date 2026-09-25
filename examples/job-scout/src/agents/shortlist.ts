import { Agent } from "graphinject";
import { ReadShortlist, WriteShortlist } from "../mcp/shortlist.js";
import { KIMI, KIMI_PRICE } from "../settings.js";

@Agent({
  name: "shortlist",
  description: "Saves the jobs the user chooses to their shortlist file and shows what is on it",
  model: KIMI,
  price: KIMI_PRICE,
  // matching "save 3" to the list and links to the file needs a little care
  thinking: "low",
  tools: [ReadShortlist, WriteShortlist],
  prompt: new URL("./shortlist.prompt.md", import.meta.url),
})
export class Shortlist {}
