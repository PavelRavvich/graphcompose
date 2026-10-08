const fs = require("fs");
const path = "packages/graphcompose/src/components/assemble.ts";
let code = fs.readFileSync(path, "utf8");

const regex =
  /const resolveMap = <T>\(map: Map<string, readonly Class\[\]>, services: any\) =>([\s\S]*?)\);\n\n  const agentPii =/m;

const replacement = `const resolveMap = <T>(map: Map<string, readonly Class[]>, services: any) =>
    new Map<string, readonly T[]>(
      Array.from(map.entries()).map(([k, classes]) => [
        k,
        classes.map((cls) => containerFor(bundle, services).get(cls)),
      ] as const)
    );

  const agentPii =`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
