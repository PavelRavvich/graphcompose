const fs = require('fs');

function replaceInFile(file, regex, replacement) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(regex, replacement);
  fs.writeFileSync(file, code);
}

replaceInFile('packages/graphcompose/src/graph/flow.ts', 
  /readonly errorType: Class \| "any";/, 
  'readonly errorType: Class;');

replaceInFile('packages/graphcompose/src/graph/flow.ts', 
  /export function catchError\(target: FlowNode, errorType: Class \| "any" = "any"\): \{ next: \(nextNode: ChoiceTarget\) => CatchStep \} \{/, 
  'export function catchError(target: FlowNode, errorType: Class = Error): { next: (nextNode: ChoiceTarget) => CatchStep } {');

replaceInFile('packages/graphcompose/src/graph/flow-nodes.ts', 
  /readonly errorType: Class \| "any";/, 
  'readonly errorType: Class;');

replaceInFile('packages/graphcompose/src/graph/build.ts', 
  /if \(catchNode\.errorType === "any" \|\| \(typeof catchNode\.errorType !== "string" && state\.lastError\.name === catchNode\.errorType\.name\)\) \{/, 
  'if (state.lastError instanceof catchNode.errorType) {');

