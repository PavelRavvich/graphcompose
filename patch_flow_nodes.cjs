const fs = require("fs");
const path = "packages/graphcompose/src/graph/flow-nodes.ts";
let code = fs.readFileSync(path, "utf8");

if (!code.includes("import { componentOf }")) {
  code = code.replace(
    'import type { Class } from "../components/injection.js";',
    'import type { Class } from "../components/injection.js";\nimport { componentOf } from "../components/metadata.js";',
  );
}

const oldRegister = `    owners.set(key, target);
    nodes.set(key, { key, name, kind: info.kind, use, label: labelOf(target) });
    return key;
  };`;

const newRegister = `    owners.set(key, target);
    nodes.set(key, { key, name, kind: info.kind, use, label: labelOf(target) });
    
    // Also register the compensation component so it's discovered by the container and agent builder
    const compMeta = componentOf(use);
    if (compMeta && 'meta' in compMeta && compMeta.meta && 'compensate' in compMeta.meta && compMeta.meta.compensate) {
       resolve(compMeta.meta.compensate as Class);
    }
    
    return key;
  };`;

code = code.replace(oldRegister, newRegister);
fs.writeFileSync(path, code);
