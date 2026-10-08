const fs = require("fs");

{
  const file = "packages/graphcompose/src/graph/flow-runners.ts";
  let code = fs.readFileSync(file, "utf-8");

  code = code.replace(
    /export function flowRunners<TName extends string>\(\n  deps: GraphDeps<TName>,\n\):/,
    'import type { RunLimits } from "./flow-runtime.js";\nexport function flowRunners<TName extends string>(\n  deps: GraphDeps<TName>,\n  run: RunLimits\n):',
  );

  code = code.replace(/spentToday: deps\.spentToday/, "spentToday: run.spentToday");

  fs.writeFileSync(file, code);
}

{
  const file = "packages/graphcompose/src/graph/flow-runtime.ts";
  let code = fs.readFileSync(file, "utf-8");

  code = code.replace(/runnerFor: flowRunners\(deps\),/, "runnerFor: flowRunners(deps, run),");

  fs.writeFileSync(file, code);
}
