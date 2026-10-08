const fs = require('fs');
const file = 'packages/graphcompose/src/testing/scripted-gateway.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  /decide: \(spec\) => \{\n      const script = book\.scriptOf\(routerKeyOf\(spec\.router\)\);\n      script\.requests\.push\(\{\n        kind: "decision",\n        input: spec\.request\.input,\n        options: spec\.request\.options\.map\(\(option\) => option\.name\),\n        instructions: spec\.request\.instructions \?\? "",\n      \}\);\n      if \(\!script\.isScripted && spec\.router\.startsWith\("guard:"\)\) \{\n        return Promise\.resolve\(GUARD_PASSES\);\n      \}\n      try \{\n        return Promise\.resolve\(outcomeOf\(script\.next\(\), spec, script\)\);\n      \} catch \(error\) \{\n        return Promise\.resolve\(failed\(book\.report\(asError\(error\)\)\.message\)\);\n      \}\n    \},/,
  `decide: async (spec) => {
      const script = book.scriptOf(routerKeyOf(spec.router));
      const req = {
        kind: "decision",
        input: spec.request.input,
        options: spec.request.options.map((option) => option.name),
        instructions: spec.request.instructions ?? "",
      };
      script.requests.push(req);
      if (!script.isScripted && spec.router.startsWith("guard:")) {
        return GUARD_PASSES;
      }
      try {
        return outcomeOf(await script.handleRequest(req), spec, script);
      } catch (error) {
        return failed(book.report(asError(error)).message);
      }
    },`
);

fs.writeFileSync(file, code);
