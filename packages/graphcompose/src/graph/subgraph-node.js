/**
 * A compiled subgraph as one flow node. It runs with the node's config, so an `interrupt()` inside
 * it pauses the whole run and `Command({ resume })` continues it (checkpoint namespaces).
 */
export function subgraphNode(subgraph, mapping) {
    return async (state, config) => mapping.output(await subgraph.invoke(mapping.input(state), config));
}
