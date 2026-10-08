import { render, vars } from "./plan.js";
/** The finish route every generated router has (relative to `routers/`). */
export const FINISH_ROUTE = {
    target: "TextWorkflowFinish",
    from: "../workflow-finishes/text.workflow-finish.js",
    text: "Stop and send the replyWith: the contributions so far replyWith the message, or the last agent asked a question and waits for the reply, or it cannot be done",
};
const quoted = (text) => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
/** `route(BillingAgent, "Handles invoices")` — how `gc` writes a route. */
export const routeLine = (target, text) => `{ prompt: "${quoted(text)}", target: ${target} }`;
/** An agent's route in the main router: the agent class and its description. */
export const agentRoute = (agent, description) => ({
    target: `${agent.pascal}Agent`,
    from: `../agents/${agent.kebab}.agent.js`,
    text: description,
});
/** The text workflow start and the text workflow finish of a new workflow. */
export function endpointFiles(dir) {
    return [
        {
            path: `${dir}/workflow-starts/text.workflow-start.ts`,
            content: render("workflow-start/text.workflow-start.ts.tmpl", {}),
        },
        {
            path: `${dir}/workflow-finishes/text.workflow-finish.ts`,
            content: render("workflow-finish/text.workflow-finish.ts.tmpl", {}),
        },
    ];
}
/** A router file (`routers/<name>.router.ts`) with its routes and their imports. */
export function routerFile(dir, router, spec, routes) {
    const imports = routes.map((r) => `import { ${r.target} } from "${r.from}";`).join("\n");
    return {
        path: `${dir}/routers/${router.kebab}.router.ts`,
        content: render("router/router.ts.tmpl", {
            ...vars(router),
            description: quoted(spec.description),
            prompt: quoted(spec.prompt),
            maxVisits: String(spec.maxVisits),
            imports,
            routes: routes.map((r) => `    ${routeLine(r.target, r.text)},`).join("\n"),
        }),
    };
}
/** What the main router of a generated workflow says; the star around it is a cycle. */
export const MAIN_ROUTER = {
    description: "Sends the message to the right agent, or sends the replyWith",
    prompt: "Pick who handles the message next. Send the replyWith when the contributions so far already cover the message.",
    maxVisits: 3,
};
