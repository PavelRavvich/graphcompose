import { callerFile } from "../components/call-site.js";
import { recordNode } from "./node-kind.js";
const routers = new WeakMap();
export function Router(options) {
    const source = callerFile();
    return (value) => {
        recordNode(value, { kind: "router", name: options.name });
        routers.set(value, source === undefined ? options : { ...options, source });
        return value;
    };
}
/** The options `@Router` recorded on a class. */
export const routerMetaOf = (target) => routers.get(target);
