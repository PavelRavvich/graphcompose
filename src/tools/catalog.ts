import { createCurrentTimeTool } from "./examples/current-time.js";
import { createToolRegistry, type ToolNameOf } from "./registry.js";

/** Every tool the project offers to its agents. Add a tool here, then list it on an agent. */
export const toolRegistry = createToolRegistry([createCurrentTimeTool()]);

export type ToolName = ToolNameOf<typeof toolRegistry>;
