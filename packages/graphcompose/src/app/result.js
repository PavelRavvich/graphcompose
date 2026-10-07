/* eslint-disable @typescript-eslint/no-unused-vars */
import { checkFlow } from "../graph/check-flow.js";
import { unwrapTarget } from "../graph/flow.js";
const nodesOfStep = (step) => {
    switch (step.kind) {
        case "to":
            return [...step.from, ...step.targets.map(unwrapTarget)];
        case "batchParallel":
            return [...step.from, step.target];
        case "choose":
            return [
                ...step.from,
                ...step.targets.filter((t) => typeof t === "function" ||
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    (typeof t === "object" && t !== null && ("use" in t || "name" in t))),
            ];
        case "chain":
            return step.nodes;
        case "join":
        case "joinAny":
        case "joinQuorum":
            return [...step.from, step.target];
    }
};
/** Every node of a flow (checked by the assembly rules) by its key. */
export function flowNodesByKey(flow) {
    const { collected } = checkFlow(flow);
    const byKey = new Map();
    for (const node of flow.flatMap(nodesOfStep)) {
        const key = collected.keyOf(node);
        if (key !== undefined && !byKey.has(key))
            byKey.set(key, node);
    }
    return byKey;
}
/** A run of the core, as the app reports it. */
export function runResultOf(run, nodes) {
    return {
        thread: run.threadId,
        status: run.status,
        answer: run.answer,
        route: run.route,
        stopReason: run.stopReason,
        path: run.path.flatMap((key) => {
            const node = nodes.get(key);
            return node === undefined ? [] : [node];
        }),
        spend: run.cost,
        ...(run.finish === undefined ? {} : { finish: run.finish, output: { text: run.answer } }),
        ...(run.finishes && Object.keys(run.finishes).length > 0 ? { finishes: run.finishes } : {}),
        ...(run.pending === undefined ? {} : { pause: run.pending }),
        ...(run.compacted === undefined ? {} : { compacted: run.compacted }),
        ...(run.traceUrl === undefined ? {} : { traceUrl: run.traceUrl }),
    };
}
