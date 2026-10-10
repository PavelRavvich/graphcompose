import { describe, expect, it } from "vitest";
import { Dataset } from "../../src/testing/dataset.js";
import { Suite } from "../../src/testing/suite.js";
import { Compare } from "../../src/testing/compare.js";
import type {
  JudgeContext,
  JudgeHandler,
  JudgeVerdict,
} from "../../src/components/judge-decorators.js";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { AIMessage } from "@langchain/core/messages";

class MockAccuracyJudge implements JudgeHandler {
  async judge(reply: string, context: JudgeContext): Promise<JudgeVerdict> {
    const passed = reply === context.expected;
    return {
      passed,
      feedback: passed ? undefined : "Accuracy failed",
      metrics: { accuracy: passed ? 1 : 0 },
    };
  }
}

class MockToneJudge implements JudgeHandler {
  async judge(reply: string): Promise<JudgeVerdict> {
    const score = reply.length > 5 ? 10 : 2;
    return {
      passed: score > 5,
      metrics: { tone: score },
    };
  }
}

describe("Ticket 125: Element Suites and Comparisons", () => {
  it("should evaluate a dataset over a target and return a SuiteReport", async () => {
    const dataset = Dataset.from([
      { id: "c1", input: { query: "A" }, expected: "A_reply" },
      { id: "c2", input: { query: "B" }, expected: "B_reply" },
    ]);

    const suite = new Suite({
      name: "Test Suite",
      dataset,
      judges: [new MockAccuracyJudge(), new MockToneJudge()],
    });

    const target = async (input: { query: string }) => {
      // Simulate target that is correct for A, but wrong for B
      return input.query === "A" ? "A_reply" : "wrong_B";
    };

    const chatModel = new FakeListChatModel({ responses: ["hi"] });
    const report = await suite.evaluate(target, { chatModel, concurrency: 1 });

    expect(report.suiteName).toBe("Test Suite");
    expect(report.totalCases).toBe(2);
    expect(report.passCount).toBe(1); // C1 passed both, C2 failed accuracy
    expect(report.failCount).toBe(1);
    expect(report.passRate).toBe(0.5);

    expect(report.metrics.accuracy?.mean ?? 0).toBe(0.5); // 1 + 0 / 2
    expect(report.metrics.tone?.mean ?? 0).toBe(10); // Both strings are > 5 chars (A_reply, wrong_B)
  });

  it("should compare two suite reports", () => {
    const dataset = Dataset.from([{ input: 1, expected: 1 }]);

    const reportV1 = {
      suiteName: "Test Suite",
      totalCases: 100,
      passCount: 50,
      failCount: 50,
      passRate: 0.5,
      metrics: { accuracy: { mean: 0.5 }, tone: { mean: 4.0 } },
      results: [],
    };

    const reportV2 = {
      suiteName: "Test Suite",
      totalCases: 100,
      passCount: 80,
      failCount: 20,
      passRate: 0.8,
      metrics: { accuracy: { mean: 0.8 }, tone: { mean: 5.0 } },
      results: [],
    };

    const comparison = Compare.reports("V1", reportV1, "V2", reportV2);
    expect(comparison.baselineName).toBe("V1");
    expect(comparison.candidateName).toBe("V2");
    expect(comparison.passRateDelta).toBeCloseTo(0.3);
    expect(comparison.metricDeltas.accuracy?.delta ?? 0).toBeCloseTo(0.3);
    expect(comparison.metricDeltas.accuracy?.deltaPercent ?? 0).toBeCloseTo(60); // (0.3 / 0.5) * 100
    expect(comparison.metricDeltas.tone?.delta ?? 0).toBeCloseTo(1.0);
    expect(comparison.metricDeltas.tone?.deltaPercent ?? 0).toBeCloseTo(25); // (1.0 / 4.0) * 100

    const summary = comparison.summary();
    expect(summary).toContain("V2 vs V1");
    expect(summary).toContain("Pass Rate: 80.0% vs 50.0% (+30.0%)");
    expect(summary).toContain("accuracy: +0.30 (+60.0%)");
    expect(summary).toContain("tone: +1.00 (+25.0%)");
  });
});
