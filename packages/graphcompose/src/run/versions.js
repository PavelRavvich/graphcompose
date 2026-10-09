import { agentLoopPromptTexts } from "../prompts/agents.js";
import { DEFAULT_COMPACTION_PROMPT } from "../prompts/compaction.js";
import { ragPromptTexts } from "../prompts/rag.js";
import { routerPromptTexts } from "../routers/index.js";
import { versionOf } from "../terns/index.js";
import { flowLines } from "../graph/flow-text.js";
/** Everything a run's behaviour depends on in config and prompts — what `configHash` hashes. */
import { stripFunctions } from "./strip-functions.js";
export const configSnapshot = (deps) => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  config: stripFunctions(deps.config),
  flow: flowLines(deps.flow),
  limits: deps.limits,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  routers: stripFunctions(deps.routers),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  prompts: stripFunctions(deps.prompts),
  compactionPrompt: deps.compactionPrompt ?? null,
});
/** Prompt and model versions of the current configuration — stored with every Tern. */
export function runVersions(deps) {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      agents: stripFunctions(deps.prompts),
      routers: routerPromptTexts,
      flowRouters: deps.routers.map(({ name, instructions, routes }) => ({
        name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        instructions: stripFunctions(instructions),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        routes: stripFunctions(routes),
      })),
      agentLoop: agentLoopPromptTexts,
      rag: ragPromptTexts,
      ...(deps.config.compaction === undefined
        ? {}
        : { compaction: deps.compactionPrompt ?? DEFAULT_COMPACTION_PROMPT }),
      guards,
    }),
    modelVersion: versionOf({
      defaults: deps.config.defaults,
      routers: deps.routers.map(({ name, model }) => ({ name, model })),
      agents: deps.config.agents,
    }),
    configVersion: deps.config.version,
    configHash: versionOf(configSnapshot(deps)),
  };
}
