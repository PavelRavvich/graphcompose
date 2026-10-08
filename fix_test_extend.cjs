const fs = require('fs');
const file = 'packages/graphcompose/src/testing/test-with.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockSubworkflow: async')) {
  code = code.replace(
    /mockOf: async \(\{ environment \}, use\) => \{/,
    'mockSubworkflow: async ({ environment }, use) => {\n      await use((workflow) => environment.mockSubworkflow(workflow));\n    },\n    mockOf: async ({ environment }, use) => {'
  );
  fs.writeFileSync(file, code);
}
