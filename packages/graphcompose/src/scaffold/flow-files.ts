import type { Names } from "./names.js";
import { render, vars } from "./plan.js";
import type { FileToWrite } from "./write.js";

/** One route of a generated router: its target class, the module it comes from, what it means. */
export interface RouteSpec {
  readonly target: string;
  readonly from: string;
  readonly text: string;
}

/** The answer route every generated router has (relative to `routers/`). */
export const ANSWER_ROUTE: RouteSpec = {
  target: "AnswerConclusion",
  from: "../conclusions/answer.conclusion.js",
  text: "Stop and send the answer: the contributions so far answer the message, or the last agent asked the user a question and waits for the reply, or it cannot be done",
};

const quoted = (text: string): string => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** `route(BillingAgent, "Handles invoices")` — how `gc` writes a route. */
export const routeLine = (target: string, text: string): string =>
  `route(${target}, "${quoted(text)}")`;

/** An agent's route in the main router: the agent class and its description. */
export const agentRoute = (agent: Names, description: string): RouteSpec => ({
  target: `${agent.pascal}Agent`,
  from: `../agents/${agent.kebab}.agent.js`,
  text: description,
});

/** The chat entry and the answer conclusion of a new workflow. */
export function endpointFiles(dir: string): FileToWrite[] {
  return [
    { path: `${dir}/entries/chat.entry.ts`, content: render("entry/chat.entry.ts.tmpl", {}) },
    {
      path: `${dir}/conclusions/answer.conclusion.ts`,
      content: render("conclusion/answer.conclusion.ts.tmpl", {}),
    },
  ];
}

/** A router file (`routers/<name>.router.ts`) with its routes and their imports. */
export function routerFile(
  dir: string,
  router: Names,
  text: { readonly description: string; readonly prompt: string },
  routes: readonly RouteSpec[],
): FileToWrite {
  const imports = routes.map((r) => `import { ${r.target} } from "${r.from}";`).join("\n");
  return {
    path: `${dir}/routers/${router.kebab}.router.ts`,
    content: render("router/router.ts.tmpl", {
      ...vars(router),
      description: quoted(text.description),
      prompt: quoted(text.prompt),
      imports,
      routes: routes.map((r) => `    ${routeLine(r.target, r.text)},`).join("\n"),
    }),
  };
}

/** What the main router of a generated workflow says. */
export const MAIN_ROUTER = {
  description: "Sends the message to the right agent, or sends the answer",
  prompt:
    "Pick who handles the message next. Send the answer when the contributions so far already cover the message.",
} as const;
