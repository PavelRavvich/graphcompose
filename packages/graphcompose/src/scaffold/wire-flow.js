import ts from "typescript";
import { ScaffoldError } from "./errors.js";
import { addImport } from "./wire.js";
function flowCalls(source) {
  const calls = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isCallExpression(node.expression.expression) &&
      ts.isIdentifier(node.expression.expression.expression) &&
      node.expression.expression.expression.text === "from"
    ) {
      calls.push({
        sources: node.expression.expression.arguments,
        method: node.expression.name.text,
        args: node.arguments,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}
const names = (list, source) => list.map((item) => item.getText(source));
/** Before the last element (`routeOne(A, Finish)` → `routeOne(A, B, Finish)`) or after the last one. */
function insertion(list, element, beforeLast) {
  const last = list.at(-1);
  if (last === undefined) return undefined;
  if (!beforeLast) return { at: last.getEnd(), text: `, ${element}` };
  const previous = list.at(-2);
  return previous === undefined
    ? { at: last.getStart(), text: `${element}, ` }
    : { at: previous.getEnd(), text: `, ${element}` };
}
const applyInserts = (text, inserts) =>
  [...inserts]
    .sort((left, right) => right.at - left.at)
    .reduce(
      (result, insert) => result.slice(0, insert.at) + insert.text + result.slice(insert.at),
      text,
    );
/**
 * Puts a new agent into a star flow: `from(Router).routes(…, Agent, Finish)` and
 * `from(…, Agent).next(Router)`; an unexpected shape → an error naming the file — never a guess.
 */
export function addAgentToFlow(file, agent, router) {
  const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true);
  const calls = flowCalls(source);
  const choose = calls.find(
    (c) => c.method === "routes" && names(c.sources, source).join() === router,
  );
  const back = calls.find(
    (c) =>
      c.method === "next" &&
      names(c.args, source).join() === router &&
      !names(c.sources, source).includes("TextWorkflowStart"),
  );
  const intoChoice = choose === undefined ? undefined : insertion(choose.args, agent, true);
  const intoReturn = back === undefined ? undefined : insertion(back.sources, agent, false);
  if (intoChoice === undefined || intoReturn === undefined) {
    throw new ScaffoldError(
      `${file.path}: no from(${router}).routes(…) and from(…).next(${router}) in the flow — add ${agent} by hand`,
    );
  }
  return { path: file.path, content: applyInserts(file.content, [intoChoice, intoReturn]) };
}
/** Wires an agent into the workflow's flow and imports it. */
export const wireAgentIntoFlow = (file, agent, router, from) => {
  const flowed = addAgentToFlow(file, agent, router);
  return { path: file.path, content: addImport(flowed.content, file.path, agent, from) };
};
