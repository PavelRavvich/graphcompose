const fs = require("fs");
const file = "packages/graphcompose/src/graph/flow-nodes.ts";
let code = fs.readFileSync(file, "utf-8");

const regex =
  /export type NextDeclaration =\n  \| \{ readonly kind: "to"; readonly targets: readonly string\[\] \}/;
code = code.replace(
  regex,
  'export type NextDeclaration =\n  | { readonly kind: "to"; readonly targets: readonly string[] }\n  | { readonly kind: "catch"; readonly errorType: Class | "any"; readonly nextNode: string }',
);

const transRegex =
  /    case "join": \{\n      const sources = defined\(step\.from\.map\(resolve\)\);/;
const transCatch = `    case "catch": {
      const source = resolve(step.target);
      const nextNode = resolve(step.nextNode);
      if (!source || !nextNode) return [];
      return [{ from: source, next: { kind: "catch", errorType: step.errorType, nextNode } }];
    }
    case "join": {
      const sources = defined(step.from.map(resolve));`;
code = code.replace(transRegex, transCatch);

fs.writeFileSync(file, code);
