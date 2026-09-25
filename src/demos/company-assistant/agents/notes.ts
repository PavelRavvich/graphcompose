import { Agent } from "../../../components/index.js";
import { KIMI, KIMI_PRICE } from "../../../bundles/shared.js";
import { NoteSave, NoteSearch } from "../tools/notes.js";

@Agent({
  name: "notes",
  description: "Saves and finds the user's personal notes and reminders",
  model: KIMI,
  price: KIMI_PRICE,
  tools: [NoteSearch, NoteSave],
  prompt: new URL("./notes.prompt.md", import.meta.url),
})
export class Notes {}
