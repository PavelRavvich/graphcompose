import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { InjectionToken, Tool, type ToolHandler } from "../../../components/index.js";

/** Where notes are kept (a JSON file). */
export const NOTES_FILE = new InjectionToken<string>("NOTES_FILE");

const Note = z.object({ id: z.string(), text: z.string(), savedAt: z.string() });
type Note = z.infer<typeof Note>;

async function loadNotes(file: string): Promise<Note[]> {
  try {
    return z.array(Note).parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

const SearchInput = z.object({ query: z.string() });
const SearchOutput = z.array(Note);

@Tool({
  name: "note_search",
  description: "Find the user's saved notes containing a word or phrase (empty = all notes).",
  input: SearchInput,
  output: SearchOutput,
  deps: [NOTES_FILE],
})
export class NoteSearch implements ToolHandler<typeof SearchInput, typeof SearchOutput> {
  constructor(private readonly file: string) {}

  async run({ query }: z.output<typeof SearchInput>): Promise<Note[]> {
    const needle = query.trim().toLowerCase();
    return (await loadNotes(this.file)).filter((note) => note.text.toLowerCase().includes(needle));
  }
}

const SaveInput = z.object({ text: z.string().min(1) });

/** Writes a note — a `write` tool, so the pause seam can ask a human first. */
@Tool({
  name: "note_save",
  description: "Save a note for the user.",
  effect: "write",
  input: SaveInput,
  output: Note,
  deps: [NOTES_FILE],
})
export class NoteSave implements ToolHandler<typeof SaveInput, typeof Note> {
  constructor(
    private readonly file: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run({ text }: z.output<typeof SaveInput>): Promise<Note> {
    const note: Note = { id: randomUUID(), text, savedAt: this.now().toISOString() };
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify([...(await loadNotes(this.file)), note], null, 2));
    return note;
  }
}
