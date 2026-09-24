// Turns vitest's coverage-summary.json into a shields.io endpoint JSON.
// Shows the weakest of lines / branches / functions / statements so the badge never flatters.
// Usage: node scripts/coverage-badge.cjs coverage/coverage-summary.json > coverage.json
const { readFileSync } = require("node:fs");

const total = JSON.parse(readFileSync(process.argv[2], "utf8")).total;
const pct = Math.min(...["lines", "branches", "functions", "statements"].map((k) => total[k].pct));
const color = pct >= 90 ? "brightgreen" : pct >= 80 ? "green" : pct >= 70 ? "yellow" : "red";

process.stdout.write(
  JSON.stringify({ schemaVersion: 1, label: "coverage", message: `${Math.floor(pct)}%`, color }),
);
