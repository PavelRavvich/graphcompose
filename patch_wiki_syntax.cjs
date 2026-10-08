const fs = require('fs');
const file = '/Users/pavelravvich/projects/langgraph-ts-template.wiki/Advanced-Routing.md';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/from\(RiskyAgent\)\n\s*\.catchError\(NetworkError\)\n\s*\.next\(FallbackAgent\)/g, 'catchError(RiskyAgent, NetworkError).next(FallbackAgent)');
code = code.replace(/from\(FailingInventoryAgent\)\n\s*\.catchError\(Error\)\n\s*\.next\(SagaOrchestrator\)/g, 'catchError(FailingInventoryAgent, Error).next(SagaOrchestrator)');

fs.writeFileSync(file, code);
