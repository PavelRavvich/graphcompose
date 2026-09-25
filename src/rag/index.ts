/** Knowledge bases (RAG): the connector contract and the reference implementation (Wiki → Knowledge bases). */
export type {
  IndexReport,
  KnowledgeSource,
  Passage,
  RagConnector,
  RagMode,
  Retrieval,
} from "./types.js";
export { SqliteFtsConnector, type FtsOptions } from "./sqlite-fts.js";
