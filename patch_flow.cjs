const fs = require("fs");
const path = "packages/graphcompose/src/graph/flow.ts";
let code = fs.readFileSync(path, "utf8");

const oldInterface = `  readonly batchParallel: (
    target: FlowNode,
    strategy: Class,
    options?: { concurrency?: number },
  ) => BatchParallelStep;`;
const newInterface = `  readonly batchParallel: (
    target: FlowNode,
    strategy: Class,
    options: { batchSize: number },
  ) => BatchParallelStep;`;
code = code.replace(oldInterface, newInterface);

const oldImpl = `    batchParallel: (target, strategy, options) => ({
      kind: "batchParallel",
      from: sources,
      target,
      strategy,
      options,
    }),`;
const newImpl = `    batchParallel: (target, strategy, options) => ({
      kind: "batchParallel",
      from: sources,
      target,
      strategy,
      options,
    }),`;
code = code.replace(oldImpl, newImpl);

const oldStep = `export interface BatchParallelStep {
  readonly kind: "batchParallel";
  readonly from: readonly FlowNode[];
  readonly target: FlowNode;
  readonly strategy: Class;
  readonly options?: { concurrency?: number };
}`;
const newStep = `export interface BatchParallelStep {
  readonly kind: "batchParallel";
  readonly from: readonly FlowNode[];
  readonly target: FlowNode;
  readonly strategy: Class;
  readonly options: { batchSize: number };
}`;
code = code.replace(oldStep, newStep);

fs.writeFileSync(path, code);
