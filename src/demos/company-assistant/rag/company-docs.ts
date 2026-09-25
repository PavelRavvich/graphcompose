import { homedir } from "node:os";
import { join } from "node:path";
import { InjectionToken, Rag } from "../../../components/index.js";
import { SqliteFtsConnector, type FtsOptions } from "../../../rag/index.js";
import { DOCS_DIR } from "../paths.js";

/** Where the docs are and where their index lives. */
export const DOCS_INDEX = new InjectionToken<FtsOptions>("DOCS_INDEX");

export const docsIndex: FtsOptions = {
  folder: DOCS_DIR,
  dbFile: join(homedir(), ".langgraph-agents", "rag", "company-assistant-docs.sqlite"),
};

/**
 * The company docs as a knowledge base — the reference connector (SQLite FTS5, BM25). Swap the
 * implementation (embeddings, a vector DB, a search API) here: nothing else changes.
 */
@Rag({
  name: "company_docs",
  description: "Nimbus Labs docs: onboarding, product, team",
  k: 4,
  deps: [DOCS_INDEX],
})
export class CompanyDocs extends SqliteFtsConnector {}
