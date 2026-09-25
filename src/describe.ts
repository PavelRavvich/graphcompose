import { parseArgs } from "node:util";
import { bundleNamed } from "./bundles.js";
import { describeBundle } from "./cli/describe.js";
import { withProfile } from "./profile-bundle.js";

// npm run describe -- [--config <bundle>] [--profile <p>] — no API key or network needed.
const { values } = parseArgs({
  options: { config: { type: "string", default: "default" }, profile: { type: "string" } },
});
const bundle = await withProfile(bundleNamed(values.config), values.profile);
describeBundle(bundle, values.profile ?? "base").forEach((line) =>
  process.stdout.write(`${line}\n`),
);
