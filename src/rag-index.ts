import { parseArgs } from "node:util";
import { bundleNamed } from "./bundles.js";

// npm run rag:index -- --config <bundle> [--kb <name>] — builds or updates the bundle's knowledge-base indexes.
const { values } = parseArgs({
  options: { config: { type: "string", default: "default" }, kb: { type: "string" } },
});
const bundle = await bundleNamed(values.config);
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
    `No knowledge bases in "${values.config}"${values.kb === undefined ? "" : ` named ${values.kb}`}.\n`,
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
