const fs = require("fs");
const file = "packages/graphcompose/src/graph/node-kind.ts";
let code = fs.readFileSync(file, "utf-8");

const regex = /"workflow-start" \| "router" \| "agent" \| "action" \| "workflow-finish"/;
code = code.replace(
  regex,
  '"workflow-start" | "router" | "agent" | "action" | "workflow-finish" | "workflow"',
);

const agentRegex =
  /if \(component\?\.kind === "agent"\) return \{ kind: "agent", name: component\.meta\.name \};/;
code = code.replace(
  agentRegex,
  `if (component?.kind === "agent") return { kind: "agent", name: component.meta.name };\n  if (component?.kind === "workflow") return { kind: "workflow", name: component.meta.meta.name }; // Note: workflow meta has name inside meta.meta? Wait, componentOf(target).meta is WorkflowMeta! So component.meta.name`,
);

// Wait, let's just use component.meta.name
code = code.replace(
  /if \(component\?\.kind === "workflow"\) return \{ kind: "workflow", name: component\.meta\.meta\.name \};/g,
  "",
); // cleanup if any

const fixRegex =
  /if \(component\?\.kind === "action"\) return \{ kind: "action", name: component\.meta\.name \};/;
code = code.replace(
  fixRegex,
  `if (component?.kind === "action") return { kind: "action", name: component.meta.name };
  if (component?.kind === "workflow") return { kind: "workflow", name: (component.meta as any).name };`,
);

fs.writeFileSync(file, code);
