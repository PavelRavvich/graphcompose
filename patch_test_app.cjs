const fs = require('fs');
const file = 'packages/graphcompose/src/testing/test-app.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockedWorkflows:')) {
  code = code.replace(
    /return buildApp\(built, \{/,
    'return buildApp(built, {\n        mockedWorkflows: (environment as any).getMockedWorkflows ? (environment as any).getMockedWorkflows() : undefined,'
  );
  fs.writeFileSync(file, code);
}
