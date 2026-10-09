import { renderTemplate } from "../scaffold/render.js";
import { ComponentError } from "./metadata.js";
import fs from "node:fs/promises";
import path from "node:path";
export function renderPromptVariables(agentName, options, source, variables) {
  const unknown = (key) =>
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
  fn.options = options;
  return fn;
}
