import { callerFile } from "../components/call-site.js";
import { recordNode } from "../graph/node-kind.js";
const quorumRouters = new WeakMap();
/**
 * `@QuorumRouter` — an active barrier that intercepts parallel branches as they finish.
 * It counts votes using `filterVote()` and cancels remaining branches as soon as `min` is reached.
 */
export function QuorumRouter(options) {
    const source = callerFile();
    const opts = options ?? {};
    return (value) => {
        recordNode(value, { kind: "quorumRouter", name: opts.name ?? value.name });
        quorumRouters.set(value, source === undefined ? opts : { ...opts, source });
        return value;
    };
}
export const quorumRouterMetaOf = (target) => quorumRouters.get(target);
