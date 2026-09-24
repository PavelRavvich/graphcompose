import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { createCurrentTimeTool, defineTool, mcpServer, type Tool } from "../tools/index.js";
import { DEFAULT_NOTES_FILE } from "./paths.js";

/** MCP: the official filesystem server over src/demo/docs, seen through typed facades. */
export const docsServer = mcpServer("docs");
const FileText = z.object({ content: z.string() });

export const listDocs = docsServer.tool({
  tool: "list_directory",
  description: "List files in a directory of the company docs (absolute path).",
  input: z.object({ path: z.string() }),
  output: FileText,
});

export const readDoc = docsServer.tool({
  tool: "read_text_file",
  description: "Read a text file of the company docs (absolute path).",
  input: z.object({ path: z.string() }),
  output: FileText,
});

const Note = z.object({ id: z.string(), text: z.string(), savedAt: z.string() });
type Note = z.infer<typeof Note>;

export type NoteSearchTool = Tool<"note_search", { query: string }, Note[]>;
export type NoteSaveTool = Tool<"note_save", { text: string }, Note>;

interface ExchangeRate {
  readonly from: string;
  readonly to: string;
  readonly rate: number;
  readonly date: string;
}
export type ExchangeRateTool = Tool<"exchange_rate", { from: string; to: string }, ExchangeRate>;

async function loadNotes(file: string): Promise<Note[]> {
  try {
    return z.array(Note).parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Personal notes in a JSON file: search reads, save writes (and so can need approval). */
export function createNoteTools(
  file = DEFAULT_NOTES_FILE,
  now: () => Date = () => new Date(),
): readonly [NoteSearchTool, NoteSaveTool] {
  const noteSearch = defineTool({
    name: "note_search",
    description: "Find the user's saved notes containing a word or phrase (empty = all notes).",
    input: z.object({ query: z.string() }),
    output: z.array(Note),
    run: async ({ query }) => {
      const needle = query.trim().toLowerCase();
      return (await loadNotes(file)).filter((note) => note.text.toLowerCase().includes(needle));
    },
  });
  const noteSave = defineTool({
    name: "note_save",
    description: "Save a note for the user.",
    effect: "write",
    input: z.object({ text: z.string().min(1) }),
    output: Note,
    run: async ({ text }) => {
      const note: Note = { id: randomUUID(), text, savedAt: now().toISOString() };
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify([...(await loadNotes(file)), note], null, 2));
      return note;
    },
  });
  return [noteSearch, noteSave] as const;
}

/** What the demo pretends one exchange-rate lookup costs — to show tool costs in FinOps. */
export const EXCHANGE_RATE_COST_USD = 0.001;

const RatesResponse = z.object({ date: z.string(), rates: z.record(z.string(), z.number()) });

/** A paid tool: live rates from frankfurter.app (free), reported to FinOps as if paid. */
export function createExchangeRateTool(
  fetchJson: (url: string) => Promise<unknown> = defaultFetchJson,
): ExchangeRateTool {
  return defineTool({
    name: "exchange_rate",
    description: "Current exchange rate between two currencies (ISO codes, e.g. USD, EUR, ILS).",
    input: z.object({ from: z.string().length(3), to: z.string().length(3) }),
    output: z.object({ from: z.string(), to: z.string(), rate: z.number(), date: z.string() }),
    run: async ({ from, to }, ctx) => {
      const url = `https://api.frankfurter.app/latest?from=${from.toUpperCase()}&to=${to.toUpperCase()}`;
      const body = RatesResponse.parse(await fetchJson(url));
      ctx.reportCost(EXCHANGE_RATE_COST_USD);
      const rate = body.rates[to.toUpperCase()];
      if (rate === undefined) throw new Error(`No rate for ${to}`);
      return { from: from.toUpperCase(), to: to.toUpperCase(), rate, date: body.date };
    },
  });
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Rates service answered ${String(response.status)}`);
  return response.json();
}

const [noteSearch, noteSave] = createNoteTools();

/** Every tool the demo agents may use. */
export const demoTools = [
  createCurrentTimeTool(),
  listDocs,
  readDoc,
  noteSearch,
  noteSave,
  createExchangeRateTool(),
] as const;

export type DemoToolName = (typeof demoTools)[number]["name"];
