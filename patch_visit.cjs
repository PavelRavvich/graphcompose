const fs = require('fs');
const file = 'packages/graphcompose/src/graph/visit.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/readonly maxVisits\?: number;\n\}/, 'readonly maxVisits?: number;\n  readonly catchesErrors?: boolean;\n}');

code = code.replace(/    \} catch \(err\) \{\n      if \(err instanceof QuorumCancelledError\) \{\n        return \{\};\n      \}\n      throw err;\n    \}/, `    } catch (err) {
      if (err instanceof QuorumCancelledError) {
        return {};
      }
      if (deps.catchesErrors) {
        return { lastError: err as Error };
      }
      throw err;
    }`);

fs.writeFileSync(file, code);
