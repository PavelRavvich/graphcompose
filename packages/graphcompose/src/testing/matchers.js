import { labelOf } from "../graph/flow.js";
import { failureFactsOf, nodeNameOf } from "./failure-facts.js";
import { toolNameOf } from "./script.js";
import { ComponentScript } from "./script-book.js";
const verdict = (context, pass, expected, got) => ({
    pass,
    message: () => `expected ${context.isNot ? "not " : ""}${expected}, ${got}`,
});
const isExecutionOutput = (value) => typeof value === "object" && value !== null && "path" in value && "thread" in value;
const wrongReceived = (matcher, wanted) => ({
    pass: false,
    message: () => `${matcher}: expected ${wanted}`,
});
const RUN = "a run result (app.execute / app.resume)";
const SCRIPT = "mockLlm(…) of an agent or a router";
const pathText = (path) => path.map(labelOf).join(" → ") || "(none)";
const endOf = (run) => {
    if (run.finish !== undefined)
        return `it finished at "${run.finish}" with ${JSON.stringify(run.output)}`;
    if (run.pause !== undefined)
        return `it paused at "${run.pause.agent}"`;
    return `it ended ${run.status} without a finish`;
};
/** A request has every expected part (strings as substrings). */
function hasParts(request, expected, context) {
    return Object.entries(expected).every(([key, value]) => {
        const actual = new Map(Object.entries(request)).get(key);
        if (typeof value === "string" && typeof actual === "string")
            return actual.includes(value);
        return context.equals(actual, value);
    });
}
/** Matchers on run results, errors and `mockLlm(…)` — all by class. Registered by the setup file. */
export const workflowMatchers = {
    toFollowPath(received, path) {
        if (!isExecutionOutput(received))
            return wrongReceived("toFollowPath", RUN);
        const pass = received.path.length === path.length && received.path.every((node, i) => node === path[i]);
        return verdict(this, pass, `the path ${pathText(path)}`, `it was ${pathText(received.path)}`);
    },
    toFinishWith(received, finish, output) {
        if (!isExecutionOutput(received))
            return wrongReceived("toFinishWith", RUN);
        const pass = received.finish === nodeNameOf(finish) &&
            (output === undefined || this.equals(received.output, output));
        const data = output === undefined ? "" : ` with ${JSON.stringify(output)}`;
        return verdict(this, pass, `the run to finish at ${labelOf(finish)}${data}`, endOf(received));
    },
    toHavePausedAt(received, agent) {
        if (!isExecutionOutput(received))
            return wrongReceived("toHavePausedAt", RUN);
        const pass = received.pause?.agent === nodeNameOf(agent);
        return verdict(this, pass, `the run to pause at ${labelOf(agent)}`, endOf(received));
    },
    toFailWith(received, failure) {
        const facts = failureFactsOf(received);
        const node = failure.node;
        const pass = received instanceof Error &&
            (failure.code === undefined || facts.codes.includes(failure.code)) &&
            (node === undefined ||
                [nodeNameOf(node), labelOf(node)].some((n) => facts.nodes.includes(n)));
        const wanted = [failure.code, node === undefined ? undefined : `at ${labelOf(node)}`];
        const got = received instanceof Error ? `got ${received.name}: ${received.message}` : "got no error";
        return verdict(this, pass, ["a failure", ...wanted].filter(Boolean).join(" "), got);
    },
    toHaveCalledTools(received, tools) {
        if (!(received instanceof ComponentScript))
            return wrongReceived("toHaveCalledTools", SCRIPT);
        const names = tools.map(toolNameOf);
        const pass = this.equals(received.toolCalls, names);
        const said = `${received.label} to call ${names.join(", ") || "no tools"}`;
        return verdict(this, pass, said, `it called ${received.toolCalls.join(", ") || "none"}`);
    },
    toHaveBeenAskedWith(received, request) {
        if (!(received instanceof ComponentScript))
            return wrongReceived("toHaveBeenAskedWith", SCRIPT);
        const pass = received.requests.some((sent) => hasParts(sent, request, this));
        const asked = `${received.label} to be asked with ${JSON.stringify(request)}`;
        return verdict(this, pass, asked, `its requests: ${JSON.stringify(received.requests)}`);
    },
};
