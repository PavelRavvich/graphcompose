import { END, Send } from "@langchain/langgraph";
import type { FlowModel } from "./check-flow.js";
import type { NextDeclaration } from "./flow-nodes.js";
import type { FlowStateType } from "./flow-state.js";
import type { GraphDeps } from "./deps.js";
import { graphNodeId, nodeKeyed, type Builder } from "./build-shared.js";

type BatchNext = Extract<NextDeclaration, { kind: "batchParallel" }>;
type Container = GraphDeps<string>["container"];

/** What the engine calls on a `@BatchParallelStrategy` (sync or async extraction). */
interface BatchExtractor {
  extract(state: FlowStateType): unknown[] | Promise<unknown[]>;
}

/** Up to `concurrencyLimit` batches of `batchSize` items from the head of the queue. */
function takeBatches(
  queue: unknown[],
  options: BatchNext["options"],
): { activeBatch: unknown[][]; newQueue: unknown[] } {
  const activeBatch: unknown[][] = [];
  let newQueue = queue;
  for (let i = 0; i < options.concurrencyLimit && newQueue.length > 0; i++) {
    activeBatch.push(newQueue.slice(0, options.batchSize));
    newQueue = newQueue.slice(options.batchSize);
  }
  return { activeBatch, newQueue };
}

/** Where the flow goes once the batch target has no batch left. */
function afterBatches(model: FlowModel, targetNodeKey: string): string {
  const outgoing = model.collected.transitions.find((tr) => tr.from === targetNodeKey);
  if (!outgoing) return END;
  if (outgoing.next.kind === "to") {
    const [first] = outgoing.next.targets;
    if (first === undefined) throw new Error(`Flow node "${targetNodeKey}" has an empty next step`);
    return graphNodeId(nodeKeyed(model, first));
  }
  if (outgoing.next.kind === "join") return graphNodeId(nodeKeyed(model, outgoing.next.target));
  return END;
}

function wireBatchLoop(
  builder: Builder,
  model: FlowModel,
  sourceNodeKey: string,
  next: BatchNext,
  container: Container,
): void {
  const targetNodeKey = next.target;
  const targetNode = nodeKeyed(model, targetNodeKey);
  const loopNodeId = `__mapeach_${sourceNodeKey}_to_${targetNodeKey}`;
  const targetCloneId = `${graphNodeId(targetNode)}_batch_clone`;

  builder.addNode(loopNodeId, async (state: FlowStateType) => {
    let queue = state._batchCursor[targetNodeKey]?.queue;
    if (queue === undefined) {
      if (container === undefined) throw new Error("batchParallel needs the DI container");
      const strategy = container.get<BatchExtractor>(next.strategy);
      queue = await strategy.extract(state);
    }
    const { activeBatch, newQueue } = takeBatches(queue, next.options);
    return { _batchCursor: { [targetNodeKey]: { queue: newQueue, activeBatch } } };
  });

  builder.addConditionalEdges(loopNodeId, (state: FlowStateType) => {
    const cursor = state._batchCursor[targetNodeKey];
    if (cursor === undefined) throw new Error(`No batch cursor for "${targetNodeKey}"`);
    const { activeBatch } = cursor;
    if (!activeBatch || activeBatch.length === 0) return afterBatches(model, targetNodeKey);
    return activeBatch.map((item) => new Send(targetCloneId, { batchItem: item }));
  });

  builder.addEdge(targetCloneId, loopNodeId);
}

export function compileBatchParallelLoops(
  builder: Builder,
  model: FlowModel,
  container: Container,
): void {
  for (const t of model.collected.transitions) {
    if (t.next.kind === "batchParallel") wireBatchLoop(builder, model, t.from, t.next, container);
  }
}
