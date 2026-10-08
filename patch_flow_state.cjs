const fs = require('fs');
const file = 'packages/graphcompose/src/graph/flow-state.ts';
let code = fs.readFileSync(file, 'utf-8');

const replacement = `  forks: Annotation<Record<string, ForkOutput<unknown>>>({
    reducer: mergeForks,
    default: () => ({}),
  }),
  /** The last caught error in the flow. */
  lastError: Annotation<Error | null>({ reducer: replace, default: () => null }),
});`;

code = code.replace(/  forks: Annotation<Record<string, ForkOutput<unknown>>>\(\{\n    reducer: mergeForks,\n    default: \(\) => \(\{\}\),\n  \}\),\n\}\);/, replacement);
fs.writeFileSync(file, code);
