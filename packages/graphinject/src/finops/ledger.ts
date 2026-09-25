import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { AgentsConfig } from "../config/types.js";
import type { UsageRecord } from "./usage.js";

/**
 * Daily spend of one workflow (config.name). Days are UTC: the counter resets at 00:00 UTC.
 * Shared by every process that uses the same ledger.
 */
export interface SpendLedger {
  readonly spentToday: (bundle: string) => Promise<number>;
  readonly record: (bundle: string, records: readonly UsageRecord[]) => Promise<void>;
}

export type Clock = () => Date;

export class BudgetExceededError extends Error {
  override name = "BudgetExceededError";
}

/** "2026-09-24" for any moment of that UTC day. */
export const utcDay = (moment: Date): string => moment.toISOString().slice(0, 10);

/** Spend allowed for one run: the run cap ∩ what is left of the workflow's daily cap. */
export function runBudgetUsd(budget: AgentsConfig["budget"], spentTodayUsd: number): number {
  return Math.min(budget.runBudgetCap, budget.dailyBudgetCap - spentTodayUsd);
}

const EntrySchema = z.object({
  at: z.string(),
  caller: z.string(),
  model: z.string(),
  costUsd: z.number(),
});

type SpendEntry = z.infer<typeof EntrySchema>;

function costOfLine(line: string): number {
  const value: unknown = JSON.parse(line);
  return EntrySchema.parse(value).costUsd;
}

const isNotFound = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

/** Append-only JSONL, one file per workflow per UTC day: <dir>/<workflow>/<YYYY-MM-DD>.jsonl. */
export function createFileLedger(dir: string, now: Clock = () => new Date()): SpendLedger {
  const fileFor = (bundle: string): string => join(dir, bundle, `${utcDay(now())}.jsonl`);
  return {
    spentToday: async (bundle) => {
      try {
        const text = await readFile(fileFor(bundle), "utf8");
        return text
          .split("\n")
          .filter(Boolean)
          .map(costOfLine)
          .reduce((sum, cost) => sum + cost, 0);
      } catch (error) {
        if (isNotFound(error)) return 0;
        throw error;
      }
    },
    record: async (bundle, records) => {
      if (records.length === 0) return;
      const at = now().toISOString();
      const lines = records.map((record): SpendEntry => ({
        at,
        caller: record.caller,
        model: record.model,
        costUsd: record.costUsd,
      }));
      await mkdir(join(dir, bundle), { recursive: true });
      await appendFile(fileFor(bundle), lines.map((line) => JSON.stringify(line) + "\n").join(""));
    },
  };
}
