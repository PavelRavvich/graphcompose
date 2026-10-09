import { extractText } from "../../../src/graph/multimodal.js";
/** The tool results an agent's request carried back to its model, in order. */
export const toolResultsOf = (request) =>
  request.kind === "chat"
    ? request.messages.filter((line) => line.role === "tool").map((line) => extractText(line.text))
    : [];
