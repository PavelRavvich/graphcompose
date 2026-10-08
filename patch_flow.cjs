const fs = require("fs");
const file = "packages/graphcompose/src/graph/flow.ts";
let code = fs.readFileSync(file, "utf-8");

// We need to add error routing
const errorRoutingRegex = /export interface ChooseStep {/;
code = code.replace(
  errorRoutingRegex,
  `export interface CatchStep {
  readonly kind: "catch";
  readonly target: FlowNode;
  readonly errorType: Class | "any";
  readonly nextNode: ChoiceTarget;
}

export interface ChooseStep {`,
);

const flowStepRegex =
  /ToStep \| ChooseStep \| ChainStep \| JoinStep \| BatchParallelStep \| JoinAnyStep \| JoinQuorumStep;/;
code = code.replace(
  flowStepRegex,
  `ToStep | ChooseStep | CatchStep | ChainStep | JoinStep | BatchParallelStep | JoinAnyStep | JoinQuorumStep;`,
);

const catchErrorExport = `
export function catchError(target: FlowNode, errorType: Class | "any" = "any"): { next: (nextNode: ChoiceTarget) => CatchStep } {
  return {
    next: (nextNode) => ({
      kind: "catch",
      target,
      errorType,
      nextNode
    })
  };
}
`;

code += catchErrorExport;

fs.writeFileSync(file, code);
