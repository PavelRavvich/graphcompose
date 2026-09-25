import { describe, expect, it } from "vitest";
import { attemptsLines } from "../src/cli/approve.js";
import { costSummary, costTotal, costTrace } from "../src/cli/finops.js";
import { buildCostReport, recordToolCost } from "../src/finops/usage.js";
import { usageRecord } from "./helpers.js";

describe("CLI cost output", () => {
  const report = buildCostReport([
    usageRecord("router:main", 0.00005),
    usageRecord("researcher", 0.003378),
    recordToolCost("exchange_rate", 0.001),
  ]);

  it("lists non-zero categories only", () => {
    expect(costSummary(report)).toBe("agents $0.003378 · routing $0.000050 · tools $0.001000");
    expect(costSummary(buildCostReport([]))).toBe("no paid calls");
  });

  it("ends with an explicit total", () => {
    expect(costTotal(report)).toBe("total $0.004428 (3 calls)");
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

  it("AC5: shows attempts per agent with more than one, and which was returned", () => {
    const result = {
      attempts: [
        { agent: "coder", attempt: 1, thinking: "low", score: 0.62, returned: false },
        { agent: "coder", attempt: 2, thinking: "medium", score: null, returned: false },
        {
          agent: "coder",
          attempt: 3,
          thinking: "high",
          score: 0.79,
          returned: true,
          reason: "best" as const,
        },
        {
          agent: "researcher",
          attempt: 1,
          thinking: "low",
          score: 0.9,
          returned: true,
          reason: "threshold" as const,
        },
      ],
    };

    expect(attemptsLines(result as never)).toEqual([
      "coder attempts: 0.62 → ? → 0.79 · returned #3 (best)",
    ]);
  });
});
