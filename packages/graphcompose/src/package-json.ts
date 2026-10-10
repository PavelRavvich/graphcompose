import { readFileSync } from "node:fs";

/**
 * This package's own package.json, parsed (from `src/` and `dist/` alike): `gc migrate imports`
 * (graphcompose-cli) reads the deprecated entries of the installed framework from it.
 */
export const frameworkPackageJson = (): unknown =>
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
