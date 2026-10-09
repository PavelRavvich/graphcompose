import type { Class } from "../components/injection.js";
import { componentOf } from "../components/metadata.js";
import { subgraphMetaOf } from "./subgraph.decorator.js";
import { collectFlow } from "./flow-nodes.js";

export class DependencyCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DependencyCycleError";
  }
}

export class WorkflowGraphValidator {
  /* eslint-disable complexity */
  public validateAcyclic(
    rootWorkflow: Class,
    visiting = new Set<Class>(),
    visited = new Set<Class>(),
  ): void {
    if (visiting.has(rootWorkflow)) {
      throw new DependencyCycleError(
        `Cyclic workflow dependency detected on: ${rootWorkflow.name}`,
      );
    }
    if (visited.has(rootWorkflow)) return;

    visiting.add(rootWorkflow);

    const comp = componentOf(rootWorkflow);
    if (comp?.kind === "workflow") {
      const collected = collectFlow(comp.meta.flow);
      for (const nodeRef of collected.nodes.values()) {
        const target = nodeRef.use;
        if (componentOf(target)?.kind === "workflow") {
          this.validateAcyclic(target, visiting, visited);
        }
        const subgraphMeta = subgraphMetaOf(target);
        if (subgraphMeta) {
          this.validateAcyclic(subgraphMeta.workflow, visiting, visited);
        }
      }
    }

    visiting.delete(rootWorkflow);
    visited.add(rootWorkflow);
  }
}
