import type { FlowStateType } from "../graph/flow-state.js";

export type PromptInput = string | ((state: FlowStateType) => string | Promise<string>);
