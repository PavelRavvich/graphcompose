import { parseArgs } from "node:util";
import { loadWorkflow } from "./cli/load-workflow.js";

// graphcompose rag:index --workflow <path> [--kb <name>] — builds or updates the workflow's knowledge-base indexes.
const { values } = parseArgs({
  options: { workflow: { type: "string", default: "./src/workflow.ts" }, kb: { type: "string" } },
});
const bundle = await loadWorkflow(values.workflow);
const services = {
  router: (name: string) => ({
    name,
    route: () => Promise.reject(new Error("rag:index does not route")),
  }),
  env: process.env,
};
const bases = (bundle.knowledgeBases?.(services) ?? []).filter(
  (kb) => values.kb === undefined || kb.name === values.kb,
);
if (bases.length === 0)
  process.stdout.write(
    `No knowledge bases in "${bundle.config.name}"${values.kb === undefined ? "" : ` named ${values.kb}`}.\n`,
  );
for (const { name, connector } of bases) {
  if (connector.index === undefined) {
    process.stdout.write(`${name}: no index to build (the connector has none)\n`);
    continue;
  }
  const report = await connector.index();
  process.stdout.write(
    `${name}: ${String(report.documents)} documents, ${String(report.chunks)} chunks, ${String(report.skipped)} unchanged · $${(report.costUsd ?? 0).toFixed(6)}\n`,
  );
}
