import type { Class } from "../components/injection.js";
import type { ChatMessage } from "../dto/standard/framework.js";
import { validate } from "../dto/schema.js";
import { entryMetaOf } from "../graph/entry.decorator.js";
import { runAgent } from "./run-agent.js";
import type { AgentRunResult, RunDeps, RunOptions } from "./types.js";

export class NotAnEntryError extends Error {
  override name = "NotAnEntryError";
}

/** Where a run continues: a thread id from an earlier result; omit to start a new conversation. */
export interface EntryRunOptions extends RunOptions {
  readonly threadId?: string;
}

/**
 * Starts a run at an entry with its input: `runEntry(deps, ChatEntry, { text: "find jobs" })`. The
 * input is checked against the entry's DTO; its `text` is the task.
 */
export async function runEntry<TName extends string>(
  deps: RunDeps<TName>,
  entry: Class,
  input: ChatMessage,
  options: EntryRunOptions = {},
): Promise<AgentRunResult> {
  const meta = entryMetaOf(entry);
  if (meta === undefined) throw new NotAnEntryError(`${entry.name} is not an @Entry`);
  const message = validate(meta.input, input);
  const { threadId, ...run } = options;
  const thread = threadId === undefined ? {} : { threadId };
  return runAgent({ task: message.text, entry: meta.name, ...thread }, deps, run);
}
