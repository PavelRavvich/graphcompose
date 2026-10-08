const fs = require('fs');
const file = 'packages/graphcompose/src/testing/matchers.ts';
let code = fs.readFileSync(file, 'utf-8');

const matchersToAdd = `

export function toHaveEdge(
  this: MatcherContext,
  workflow: Class,
  from: FlowNode,
  to: FlowNode
): MatcherResult {
  const { componentOf } = require('../components/metadata.js');
  const { nodeNameOf } = require('./failure-facts.js');
  
  const comp = componentOf(workflow);
  if (!comp || comp.kind !== "workflow") {
    return {
      pass: false,
      message: () => \`toHaveEdge: expected a workflow class, got \${workflow?.name}\`,
    };
  }
  const flow = comp.meta.flow;
  const fromName = nodeNameOf(from);
  const toName = nodeNameOf(to);
  
  let found = false;
  for (const step of flow) {
    if (step.kind === "choose" && nodeNameOf(step.from) === fromName) {
      if (step.routes.some(r => r.kind === "node" && nodeNameOf(r.node) === toName)) {
        found = true;
      }
    } else if (step.kind === "to" && nodeNameOf(step.from) === fromName && nodeNameOf(step.target) === toName) {
      found = true;
    } else if (step.kind === "join" && nodeNameOf(step.from) === fromName && nodeNameOf(step.target) === toName) {
      found = true;
    }
  }

  return {
    pass: found,
    message: () =>
      this.isNot
        ? \`expected \${workflow.name} not to have an edge from \${fromName} to \${toName}\`
        : \`expected \${workflow.name} to have an edge from \${fromName} to \${toName}\`,
  };
}

export function toHaveQuorumTimeout(
  this: MatcherContext,
  workflow: Class,
  router: Class,
  seconds: number
): MatcherResult {
  const { componentOf } = require('../components/metadata.js');
  const { nodeNameOf } = require('./failure-facts.js');
  
  const comp = componentOf(workflow);
  if (!comp || comp.kind !== "workflow") {
    return {
      pass: false,
      message: () => \`toHaveQuorumTimeout: expected a workflow class, got \${workflow?.name}\`,
    };
  }
  const flow = comp.meta.flow;
  const routerName = nodeNameOf(router);
  
  let found = false;
  let actualTimeout = undefined;
  
  for (const step of flow) {
    if (step.kind === "joinAny" && nodeNameOf(step.target) === routerName) {
      actualTimeout = step.timeoutSeconds;
      if (step.timeoutSeconds === seconds) {
        found = true;
      }
    }
  }

  return {
    pass: found,
    message: () =>
      this.isNot
        ? \`expected \${workflow.name} not to have a quorum timeout of \${seconds}s for \${routerName}\`
        : \`expected \${workflow.name} to have a quorum timeout of \${seconds}s for \${routerName}\${actualTimeout !== undefined ? \`, but got \${actualTimeout}s\` : ' but edge not found'}\`,
  };
}
`;

code = code.replace(
  /export function toHaveCalledTools\(/,
  matchersToAdd + '\nexport function toHaveCalledTools('
);

fs.writeFileSync(file, code);
