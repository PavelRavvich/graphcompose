import { describe, expect, it } from "vitest";
import { costSummary, costTrace } from "../src/cli/finops.js";
import { buildCostReport, recordToolCost } from "../src/finops/usage.js";
import { usageRecord } from "./helpers.js";

describe("CLI cost output", () => {
  const report = buildCostReport([
    usageRecord("router:main", 0.00005),
    usageRecord("researcher", 0.003378),
    recordToolCost("exchange_rate", 0.001),
  ]);

  it("summarises non-zero categories", () => {
    expect(costSummary(report)).toBe(
      "$0.004428 in 3 calls — agents $0.003378 · routing $0.000050 · tools $0.001000",
    );
    expect(costSummary(buildCostReport([]))).toBe("$0.000000 in 0 calls");
  });

  it("says how each call was priced", () => {
    const api = buildCostReport([{ ...usageRecord("router:main", 0.00002), costSource: "api" }]);

    expect(costTrace(api)[0]).toMatch(/api-priced$/);
  });

  it("prints one line per call in order", () => {
    const lines = costTrace(report);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^ 1\. router:main\s+\S+\s+\$0\.000050\s+\d+ in \/ \d+ out$/);
    expect(lines[2]).toMatch(
      /^ 3\. tool:exchange_rate\s+exchange_rate\s+\$0\.001000\s+tool-reported$/,
    );
  });
});
