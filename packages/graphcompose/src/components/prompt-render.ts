import type { PromptOptions } from "./prompt-options.js";
import type { FlowStateType } from "../graph/flow-state.js";
import { renderTemplate } from "../scaffold/render.js";
import { ComponentError } from "./metadata.js";
import fs from "node:fs/promises";
import path from "node:path";

export function renderPromptVariables(
  agentName: string,
  options: PromptOptions | undefined,
  source: string | undefined,
  variables?: Readonly<Record<string, unknown>>,
): (state: FlowStateType) => Promise<string> {
  const unknown = (key: string) =>
    new ComponentError(`@Agent "${agentName}": unknown prompt variable {{${key}}}`);

  if (options?.prompt && variables) {
    // Eagerly throw on unknown static template vars
    renderTemplate(options.prompt, variables, unknown);
  }

  const fn = async () => {
    if (!options) return "";
    let text = options.prompt ?? "";
    if (options.promptUrls && options.promptUrls.length > 0) {
      if (!source)
        throw new ComponentError(
          `Cannot resolve promptUrls for ${agentName} because source file is unknown`,
        );
      const dir = path.dirname(source);
      for (const url of options.promptUrls) {
        const p = path.resolve(dir, url);
        const content = await fs.readFile(p, "utf-8");
        text += (text ? "\n\n" : "") + content;
      }
    }
    if (!variables) return text;
    return renderTemplate(text, variables, unknown);
  };
  (fn as any).options = options;
  return fn;
}
