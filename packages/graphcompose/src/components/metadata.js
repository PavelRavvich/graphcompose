/** Decorator metadata per class. Symbol.metadata is not available at runtime on Node 26. */
const components = new WeakMap();
export const recordComponent = (target, meta) => {
    components.set(target, meta);
};
export const componentOf = (target) => components.get(target);
export class ComponentError extends Error {
    name = "ComponentError";
}
export function requireComponent(target, kind, where) {
    const meta = componentOf(target);
    if (meta?.kind !== kind) {
        throw new ComponentError(`${where}: ${target.name || "(anonymous class)"} is not a @${kindName[kind]} component`);
    }
    return meta;
}
const kindName = {
    "pii-policy": "@PiiPolicy",
    guardrail: "@Guardrail",
    "inbound-adapter": "@InboundChannelAdapter",
    "semantic-inbound-adapter": "@SemanticInboundChannelAdapter",
    tool: "Tool",
    "mcp-server": "McpServer",
    "mcp-tool": "McpTool",
    agent: "Agent",
    action: "WorkflowAction",
    injectable: "Injectable",
    rag: "Rag",
    workflow: "Workflow",
    channel: "Channel",
};
