import type { App } from "../app/types.js";
import type { Class } from "../components/injection.js";

export class NoTextStartError extends Error {
  override name = "NoTextStartError";
}

/** The workflow start the terminal's text goes to; a workflow without one cannot chat. */
export function textStartOrFail(app: Pick<App, "name" | "textStart">): Class {
  if (app.textStart === undefined) {
    throw new NoTextStartError(`Workflow "${app.name}" has no @WorkflowStart for a text`);
  }
  return app.textStart;
}
