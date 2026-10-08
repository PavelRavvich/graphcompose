const fs = require("fs");

// 1. assemble.ts
let p = "packages/graphcompose/src/components/assemble.ts";
let code = fs.readFileSync(p, "utf8");
code = code.replace(
  "classes.map((cls) => containerFor(bundle, services).get(cls)),",
  "classes.map((cls) => containerFor(bundle, services).get(cls) as T),",
);
fs.writeFileSync(p, code);

// 2. meta-types.ts
p = "packages/graphcompose/src/components/meta-types.ts";
code = fs.readFileSync(p, "utf8");
code = code.replace(
  /readonly compensate\?: Class;\n\s*readonly compensate\?: Class;/g,
  "readonly compensate?: Class;",
);
fs.writeFileSync(p, code);

// 3. saga.ts
p = "packages/graphcompose/src/core/saga.ts";
code = fs.readFileSync(p, "utf8");
code = code.replace("return { lastError: null };", "return {};");
code = code.replace("return { lastError: null };", "return {};");
fs.writeFileSync(p, code);

// 4. build.ts
p = "packages/graphcompose/src/graph/build.ts";
code = fs.readFileSync(p, "utf8");
code = code.replace(
  "nodeKeyed(model, outgoing.next.targets[0])",
  "nodeKeyed(model, outgoing.next.targets[0]!)",
);
fs.writeFileSync(p, code);

// 5. flow-nodes.ts
p = "packages/graphcompose/src/graph/flow-nodes.ts";
code = fs.readFileSync(p, "utf8");
code = code.replace(
  "const nextNode = resolve(step.nextNode);",
  "const nextNode = resolve(unwrapTarget(step.nextNode));",
);
fs.writeFileSync(p, code);

// 6. rules.ts
p = "packages/graphcompose/src/graph/rules.ts";
code = fs.readFileSync(p, "utf8");
code = code.replace(
  "return [transition.next.target];",
  'return transition.next.kind === "catch" ? [transition.next.nextNode] : [transition.next.target];',
);
fs.writeFileSync(p, code);
