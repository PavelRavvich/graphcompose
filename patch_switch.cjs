const fs = require("fs");

{
  const file = "packages/graphcompose/src/app/result.ts";
  let code = fs.readFileSync(file, "utf-8");
  code = code.replace(
    /case "joinQuorum":\s+return step\.from;/,
    'case "joinQuorum":\n      return step.from;\n    case "catch":\n      return [step.target];',
  );
  fs.writeFileSync(file, code);
}

{
  const file = "packages/graphcompose/src/graph/flow-text.ts";
  let code = fs.readFileSync(file, "utf-8");
  code = code.replace(
    /quorumRouter: "Quorum",/,
    'quorumRouter: "Quorum",\n  workflow: "Workflow",',
  );

  code = code.replace(
    /case "joinQuorum":\s+return `\$\{src\} joinQuorum\(\$\{step\.count\}\) \$\{name\(step\.target\)\}`;/,
    'case "joinQuorum":\n      return `${src} joinQuorum(${step.count}) ${name(step.target)}`;\n    case "catch":\n      return `catchError(${name(step.target)}, ${typeof step.errorType === "string" ? step.errorType : step.errorType.name}) routes ${name(step.nextNode)}`;',
  );

  fs.writeFileSync(file, code);
}
