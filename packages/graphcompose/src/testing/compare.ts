import type { SuiteReport } from "./suite.js";

export interface ComparisonReport {
  readonly baselineName: string;
  readonly candidateName: string;
  readonly passRateDelta: number;
  readonly metricDeltas: Record<string, { delta: number; deltaPercent: number }>;
  summary(): string;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Compare {
  static reports(
    baselineName: string,
    baselineReport: SuiteReport,
    candidateName: string,
    candidateReport: SuiteReport
  ): ComparisonReport {
    const passRateDelta = candidateReport.passRate - baselineReport.passRate;
    
    const metricDeltas: Record<string, { delta: number; deltaPercent: number }> = {};
    for (const [key, baseMetric] of Object.entries(baselineReport.metrics)) {
      const candMetric = candidateReport.metrics[key];
      if (candMetric !== undefined) {
        const delta = candMetric.mean - baseMetric.mean;
        const deltaPercent = baseMetric.mean === 0 ? 0 : (delta / Math.abs(baseMetric.mean)) * 100;
        metricDeltas[key] = { delta, deltaPercent };
      }
    }

    return {
      baselineName,
      candidateName,
      passRateDelta,
      metricDeltas,
      summary: () => {
        let text = `Comparison: ${candidateName} vs ${baselineName}\n`;
        text += `Pass Rate: ${(candidateReport.passRate * 100).toFixed(1)}% vs ${(baselineReport.passRate * 100).toFixed(1)}% `;
        text += `(${(passRateDelta > 0 ? "+" : "")}${(passRateDelta * 100).toFixed(1)}%)\n`;
        text += `Metrics:\n`;
        for (const [k, d] of Object.entries(metricDeltas)) {
          text += `  - ${k}: ${(d.delta > 0 ? "+" : "")}${d.delta.toFixed(2)} (${(d.deltaPercent > 0 ? "+" : "")}${d.deltaPercent.toFixed(1)}%)\n`;
        }
        return text;
      }
    };
  }
}
