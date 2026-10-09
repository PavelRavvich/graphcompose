import fs from 'fs';

for (const file of ['packages/graphcompose/tests/graph/saga.test.ts', 'packages/graphcompose/tests/graph/saga-orchestration.test.ts']) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/SagaOrchestrator/g, 'LocalSagaStrategy');
    content = content.replace(/\.next\(LocalSagaStrategy\)/g, '.compensateWith(LocalSagaStrategy)');
    fs.writeFileSync(file, content);
  }
}
