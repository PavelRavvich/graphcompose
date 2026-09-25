import { reasoningPromptTexts } from "../prompts/agents.js";
import { DEFAULT_COMPACTION_PROMPT } from "../prompts/compaction.js";
import { routerPromptTexts } from "../routers/index.js";
import { versionOf } from "../terns/index.js";
import type { RunDeps } from "./types.js";

/** Prompt and model versions of the current configuration — stored with every Tern. */
export function runVersions<TName extends string>(
  deps: RunDeps<TName>,
): { readonly promptVersion: string; readonly modelVersion: string } {
  const guards = [...deps.guards.input, ...deps.guards.output].map(
    ({ name, question, flag, pass }) => ({
      name,
      question,
      flag,
      pass,
    }),
  );
  return {
    promptVersion: versionOf({
      agents: deps.prompts,
      routers: routerPromptTexts,
      reasoning: reasoningPromptTexts,
      ...(deps.config.compaction === undefined
        ? {}
        : { compaction: deps.compactionPrompt ?? DEFAULT_COMPACTION_PROMPT }),
      guards,
    }),
    modelVersion: versionOf({
      defaults: deps.config.defaults,
      routers: deps.config.routers,
      agents: deps.config.agents,
    }),
  };
}
