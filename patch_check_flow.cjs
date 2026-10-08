const fs = require('fs');
const file = 'packages/graphcompose/src/graph/check-flow.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/readonly next: ReadonlyMap<string, NextDeclaration>;/, 'readonly next: ReadonlyMap<string, NextDeclaration>;\n  readonly catches: ReadonlyMap<string, NextDeclaration[]>;');

const nextRegex = /  const next = new Map\(\n    collected\.transitions\.map\(\(transition\) => \[transition\.from, transition\.next\]\),\n  \);/;
const replacement = `  const next = new Map<string, NextDeclaration>();
  const catches = new Map<string, NextDeclaration[]>();
  for (const t of collected.transitions) {
    if (t.next.kind === "catch") {
      catches.set(t.from, [...(catches.get(t.from) || []), t.next]);
    } else {
      next.set(t.from, t.next);
    }
  }`;

code = code.replace(nextRegex, replacement);
code = code.replace(/return \{ nodes: collected\.nodes, next, collected \};/, 'return { nodes: collected.nodes, next, catches, collected };');

fs.writeFileSync(file, code);
