import { reasoningPromptTexts } from "../prompts/agents.js";
import { DEFAULT_COMPACTION_PROMPT } from "../prompts/compaction.js";
import { ragPromptTexts } from "../prompts/rag.js";
import { routerPromptTexts } from "../routers/index.js";
import { versionOf } from "../terns/index.js";
import type { RunDeps } from "./types.js";

/** Everything a run's behaviour depends on in config and prompts — what `configHash` hashes. */
export const configSnapshot = <TName extends string>(deps: RunDeps<TName>): unknown => ({
  config: deps.config,
  prompts: deps.prompts,
  compactionPrompt: deps.compactionPrompt ?? null,
});

/** Prompt and model versions of the current configuration — stored with every Tern. */
export function runVersions<TName extends string>(
  deps: RunDeps<TName>,
): {
  readonly promptVersion: string;
  readonly modelVersion: string;
  readonly configVersion: string;
  readonly configHash: string;
} {
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
      rag: ragPromptTexts,
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
    configVersion: deps.config.version,
    configHash: versionOf(configSnapshot(deps)),
  };
}
