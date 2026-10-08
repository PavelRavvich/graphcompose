const fs = require("fs");
const file = "/Users/pavelravvich/projects/langgraph-ts-template.wiki/_Sidebar.md";
let code = fs.readFileSync(file, "utf-8");

if (!code.includes("[Observability]")) {
  code = code.replace(
    /- \[Tracing\]\(Tracing\)/,
    "- [Tracing](Tracing)\n- [Observability](Observability)",
  );
  fs.writeFileSync(file, code);
}
