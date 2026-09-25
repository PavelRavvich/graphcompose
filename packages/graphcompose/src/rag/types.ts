/** One retrieved passage: its text and where it came from (cited as `[source]`). */
export interface Passage {
  readonly text: string;
  readonly source: string;
  readonly score?: number;
}

export interface Retrieval {
  readonly passages: readonly Passage[];
  /** What this retrieval cost (embeddings, a search API); 0 or absent when free. */
  readonly costUsd?: number;
}

export interface IndexReport {
  readonly documents: number;
  readonly chunks: number;
  /** Documents left as they were (unchanged since the last index). */
  readonly skipped: number;
  readonly costUsd?: number;
}

/**
 * The contract of a knowledge base. Implement it with any embeddings and storage; the core does the
 * wiring (tool or context), cost reporting and tracing.
 */
export interface RagConnector {
  retrieve(
    query: string,
    options: { readonly k: number; readonly signal: AbortSignal },
  ): Promise<Retrieval>;
  /** Optional: build or update the index (`npm run rag:index`). */
  index?(): Promise<IndexReport>;
}

/** A knowledge base as the core runs it in context mode (retrieved before the agent's loop). */
export interface KnowledgeSource {
  readonly name: string;
  readonly k: number;
  readonly retrieve: RagConnector["retrieve"];
}

/** How an agent gets the passages: it calls `search_<name>` itself, or they come before the task. */
export type RagMode = "tool" | "context";
