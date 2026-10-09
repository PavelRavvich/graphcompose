import { componentOf, requireComponent } from "../components/metadata.js";
import { collectFlow } from "../graph/flow-nodes.js";
const metaOf = (workflow) => requireComponent(workflow, "workflow", "testWith").meta;
/** The workflow's MCP server classes and their names. */
export function mcpServersOf(workflow) {
  return new Map(
    (metaOf(workflow).mcp ?? []).map((cls) => [
      cls,
      requireComponent(cls, "mcp-server", "testWith").meta.name,
    ]),
  );
}
/** Every class the workflow's container may create: providers, the agents' tools and knowledge bases. */
export function usedComponentsOf(workflow) {
  const meta = metaOf(workflow);
  const agents = [...collectFlow(meta.flow).nodes.values()].flatMap((ref) => {
    const component = componentOf(ref.use);
    return component?.kind === "agent" ? [component.meta] : [];
  });
  return new Set([
    ...(meta.providers ?? []).filter((provider) => !("provide" in provider)),
    ...agents.flatMap((agent) => agent.tools ?? []),
    ...agents.flatMap((agent) => (agent.rag ?? []).map((binding) => binding.use)),
  ]);
}
