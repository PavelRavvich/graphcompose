import fs from "fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.scripts.check =
  "npm run check:rules && npm run check:names && npm run build && npm run format:check && npm run typecheck && npm run coverage && npm run check:models";
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
