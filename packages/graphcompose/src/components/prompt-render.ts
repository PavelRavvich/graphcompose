import type { PromptInput } from "./prompt-input.js";
import type { FlowStateType } from "../graph/flow-state.js";
import { renderTemplate } from "../scaffold/render.js";
import { ComponentError } from "./metadata.js";

export function renderPromptVariables(
  agentName: string,
  instructions: PromptInput,
  variables?: Readonly<Record<string, string>>,
): PromptInput {
  if (!variables) return instructions;
  const unknown = (key: string) =>
    new ComponentError(`@Agent "${agentName}": unknown prompt variable {{${key}}}`);
  if (typeof instructions === "string") {
    return renderTemplate(instructions, variables, unknown);
  }
  return async (state: FlowStateType) =>
    renderTemplate(await instructions(state), variables, unknown);
}
