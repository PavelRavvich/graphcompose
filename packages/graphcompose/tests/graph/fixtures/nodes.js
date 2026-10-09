import { extractText } from "../../../src/graph/multimodal.js";
import { recordNode } from "../../../src/graph/node-kind.js";
import { usageRecord } from "../../helpers.js";
/** Test-only node decorator: marks a class as a flow node of a kind (workflow starts and workflow finishes come in branch B). */
export const testNode = (kind, name) => (value) => {
  recordNode(value, { kind, name });
  return value;
};
/** A router driven by a fixed decision list; each decision costs `costUsd`. */
export function scriptedRouter(name, decisions, costUsd = 0) {
  const queue = [...decisions];
  const requests = [];
  return {
    name,
    requests,
    route: (request) => {
      requests.push(request);
      const next = queue.shift();
      if (next === undefined)
        return Promise.resolve({ kind: "failed", reason: "script exhausted" });
      return Promise.resolve({
        kind: "decided",
        decision: { next, reason: "scripted" },
        usage: usageRecord(`router:${name}`, costUsd),
      });
    },
  };
}
/** A test agent: answers with a fixed text, spending `costUsd`. */
export const fixedAnswer =
  (name, costUsd = 0) =>
  () =>
    Promise.resolve({
      contributions: [{ agent: name, content: `${name} answered` }],
      usage: [usageRecord(name, costUsd)],
    });
/** Workflow starts do nothing; workflow finishes copy the last contribution into `replyWith`; agents replyWith. */
export function testRunner(node, agentCostUsd = 0) {
  switch (node.kind) {
    case "agent":
      return fixedAnswer(node.name, agentCostUsd);
    case "workflow-finish":
      return (state) =>
        Promise.resolve({
          replyWith: (() => {
            const c = state.contributions.at(-1)?.content;
            return c ? extractText(c) : "";
          })(),
        });
    default:
      return () => Promise.resolve({});
  }
}
/** A runtime of test nodes: routers by name from `routers`, no daily spend unless given. */
export function testRuntime(routers, overrides = {}) {
  return {
    runnerFor: (node) => testRunner(node),
    routerFor: (router) => {
      const found = routers[router.name];
      if (found === undefined) throw new Error(`no test router ${router.name}`);
      return found;
    },
    routerMemory: { summaries: 0, turns: 0 },
    limits: {},
    spentToday: () => Promise.resolve(0),
    ...overrides,
  };
}
