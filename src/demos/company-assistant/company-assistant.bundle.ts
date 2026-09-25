import { Bundle } from "../../components/index.js";
import { Coder } from "../../bundles/research-coder/agents/coder.js";
import { BUDGET, DEFAULTS, GUARDS, KIMI, KIMI_PRICE, ROUTERS } from "../../bundles/shared.js";
import { writeToolsNeedApproval } from "../../pause/index.js";
import { Notes } from "./agents/notes.js";
import { Researcher } from "./agents/researcher.js";
import { DocsServer } from "./mcp/docs.js";
import { DEFAULT_NOTES_FILE, DOCS_DIR } from "./paths.js";
import { NOTES_FILE } from "./tools/notes.js";

/** A new joiner's helper at Nimbus Labs — docs over MCP, notes, coder; a bit of everything. */
const assistant = {
  version: "1.1.0",
  defaults: DEFAULTS,
  budget: BUDGET,
  routers: ROUTERS,
  guards: GUARDS,
  compaction: {
    every: 5,
    keep: 10,
    model: { model: KIMI, thinking: "none" as const, price: KIMI_PRICE },
  },
  agents: [Researcher, Notes, Coder],
  mcp: [DocsServer],
  providers: [{ provide: NOTES_FILE, useValue: DEFAULT_NOTES_FILE }],
  promptVariables: { docsDir: DOCS_DIR },
};

@Bundle({ ...assistant, name: "company-assistant" })
export class CompanyAssistant {}

/** The same agents; writing a note waits for a human (pause seam). */
@Bundle({ ...assistant, name: "company-assistant-approval", needsApproval: writeToolsNeedApproval })
export class CompanyAssistantApproval {}
