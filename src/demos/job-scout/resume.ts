import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, resolve } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { defineTool, type Tool } from "../../tools/index.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** The model gets at most this much resume text. */
export const MAX_RESUME_CHARS = 20_000;

export type PdfExtractor = (bytes: Uint8Array) => Promise<string>;

const extractPdf: PdfExtractor = async (bytes) => {
  const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
  return text;
};

const FORMATS = { ".pdf": "pdf", ".md": "markdown", ".txt": "text" } as const;
type Format = (typeof FORMATS)[keyof typeof FORMATS];

const isFormatExt = (ext: string): ext is keyof typeof FORMATS => ext in FORMATS;

interface Resume {
  readonly path: string;
  readonly format: Format;
  readonly text: string;
  readonly truncated: boolean;
}

export type ReadResumeTool = Tool<"read_resume", { path: string }, Resume>;

const expandHome = (path: string): string =>
  path.startsWith("~/") ? `${homedir()}${path.slice(1)}` : path;

/** Reads a resume from disk: PDF, Markdown or plain text. */
export function createReadResumeTool(pdf: PdfExtractor = extractPdf): ReadResumeTool {
  return defineTool({
    name: "read_resume",
    description:
      "Read the user's resume from a local file (.pdf, .md or .txt). Pass the path the user gave.",
    input: z.object({ path: z.string().min(1) }),
    output: z.object({
      path: z.string(),
      format: z.enum(["pdf", "markdown", "text"]),
      text: z.string(),
      truncated: z.boolean(),
    }),
    run: async ({ path }) => {
      const full = resolve(expandHome(path.trim()));
      const ext = extname(full).toLowerCase();
      if (!isFormatExt(ext))
        throw new Error(`Unsupported resume format "${ext}" — use .pdf, .md or .txt`);
      if ((await stat(full)).size > MAX_FILE_BYTES)
        throw new Error("Resume file is larger than 5 MB");
      const bytes = await readFile(full);
      const format = FORMATS[ext];
      const raw = format === "pdf" ? await pdf(new Uint8Array(bytes)) : bytes.toString("utf8");
      const text = raw.replace(/[ \t]+/g, " ").trim();
      return {
        path: full,
        format,
        text: text.slice(0, MAX_RESUME_CHARS),
        truncated: text.length > MAX_RESUME_CHARS,
      };
    },
  });
}
