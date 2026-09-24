import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));

/** Folder the filesystem MCP server may read (and nothing else). */
export const DOCS_DIR = join(DEMO_DIR, "docs");

/** The official filesystem MCP server, installed as a dev dependency. */
export const FILESYSTEM_SERVER = join(
  DEMO_DIR,
  "..",
  "..",
  "node_modules",
  ".bin",
  "mcp-server-filesystem",
);

/** Notes live outside the repo, next to the ledger and Terns. */
export const DEFAULT_NOTES_FILE = join(homedir(), ".langgraph-agents", "demo-notes.json");
