import { ScaffoldError } from "./errors.js";
import { namesOf } from "./names.js";
const list = (text) =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
/** `--agents "triage:Sorts requests,answerer:Answers"` + `--tools "answerer:search_orders"`. */
export function agentsFrom(agents, tools = "") {
  const parsed = list(agents).map((item) => {
    const [name = "", ...rest] = item.split(":");
    return {
      name: name.trim(),
      description: rest.join(":").trim() || `${namesOf(name).title} (TODO: describe the role)`,
      tools: [],
    };
  });
  for (const item of list(tools)) {
    const [agent = "", tool = ""] = item.split(":").map((part) => part.trim());
    const target = parsed.find((a) => namesOf(a.name).snake === namesOf(agent).snake);
    if (target === undefined || tool === "")
      throw new ScaffoldError(
        `--tools "${item}": expected <agent>:<tool> for an agent in --agents`,
      );
    target.tools.push(tool);
  }
  return parsed;
}
/** `--mcp none | filesystem:<dir> | command:<cmd>:<tool>` (the server is named after the workflow). */
export function mcpFrom(value, workflow) {
  if (value === "none") return { kind: "none" };
  const [kind = "", first = "", second = ""] = value.split(":");
  if (kind === "filesystem" && first !== "")
    return { kind: "filesystem", name: `${workflow} files`, dir: first };
  if (kind === "command" && first !== "" && second !== "")
    return { kind: "command", name: `${workflow} server`, command: first, tool: second };
  throw new ScaffoldError(`--mcp "${value}": use none, filesystem:<dir> or command:<cmd>:<tool>`);
}
/** What the flags replyWith: `rag: null` = explicitly none. */
function parsed(name, flags) {
  const rag =
    flags.rag === undefined
      ? {}
      : { rag: flags.rag === "none" ? null : { name: `${name} notes`, folder: flags.rag } };
  return {
    ...(flags.agents === undefined ? {} : { agents: agentsFrom(flags.agents, flags.tools) }),
    ...(flags.mcp === undefined ? {} : { mcp: mcpFrom(flags.mcp, name) }),
    ...rag,
  };
}
/** Everything the questionnaire would ask, from flags; `--yes` fills what is missing with defaults. */
export function specFromFlags(name, flags) {
  const { rag, ...answers } = parsed(name, flags);
  const withRag = rag === undefined || rag === null ? {} : { rag };
  if (flags.yes !== true) return { name, ...answers, ...withRag };
  const defaultAgent = {
    name: "assistant",
    description: `Helps with ${namesOf(name).title}`,
    tools: [],
  };
  return {
    name,
    agents: answers.agents ?? [defaultAgent],
    mcp: answers.mcp ?? { kind: "none" },
    ...withRag,
  };
}
export const isComplete = (spec) => spec.agents !== undefined && spec.mcp !== undefined;
