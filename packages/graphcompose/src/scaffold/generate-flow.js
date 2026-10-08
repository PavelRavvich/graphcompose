import { agentRoute, FINISH_ROUTE, routeLine, routerFile, } from "./flow-files.js";
import { namesOf } from "./names.js";
import { agentFiles } from "./plan.js";
import { read, targetWorkflow } from "./project-files.js";
import { wire } from "./wire.js";
import { wireAgentIntoFlow } from "./wire-flow.js";
const MAIN_ROUTER_CLASS = "MainRouter";
/**
 * `gc g agent <name> --workflow …`: the agent and its prompt; the agent joins the star — a route in the
 * main router (`routers/main.router.ts`) and both transitions in the workflow's flow.
 */
export function planAgent(root, name, o) {
    const { dir, module } = targetWorkflow(root, o.workflow ?? "", "agent");
    const n = namesOf(name);
    const description = o.description ?? `${n.title} (TODO: describe the role)`;
    const agent = `${n.pascal}Agent`;
    const route = agentRoute(n, description);
    return {
        create: agentFiles(dir, n, description, []),
        modify: [
            wireAgentIntoFlow(module, agent, MAIN_ROUTER_CLASS, `./agents/${n.kebab}.agent.js`),
            wire(read(root, `${dir}/routers/main.router.ts`), "Router", "routes", routeLine(route.target, route.text), agent, route.from),
        ],
    };
}
/**
 * `gc g router <name> --workflow …`: a router with the finish route, ready for routes of its own. It is
 * not put into the flow — where it sits (`from(…).next(Router)`, `from(Router).routeOne(…)`) is a choice.
 */
export function planRouter(root, name, o) {
    const { dir } = targetWorkflow(root, o.workflow ?? "", "router");
    read(root, `${dir}/workflow-finishes/text.workflow-finish.ts`);
    const n = namesOf(name);
    const text = {
        description: o.description ?? `${n.title} (TODO: say what it decides)`,
        prompt: "TODO: say how to choose between the routes.",
        maxVisits: 1,
    };
    return { create: [routerFile(dir, n, text, [FINISH_ROUTE])], modify: [] };
}
