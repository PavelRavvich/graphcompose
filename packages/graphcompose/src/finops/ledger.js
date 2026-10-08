import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
/** "2026-09-24" for any moment of that UTC day. */
export const utcDay = (moment) => moment.toISOString().slice(0, 10);
const EntrySchema = z.object({
    at: z.string(),
    caller: z.string(),
    model: z.string(),
    costUsd: z.number(),
});
function costOfLine(line) {
    const value = JSON.parse(line);
    return EntrySchema.parse(value).costUsd;
}
const isNotFound = (error) => error instanceof Error && "code" in error && error.code === "ENOENT";
/** Append-only JSONL, one file per workflow per UTC day: <dir>/<workflow>/<YYYY-MM-DD>.jsonl. */
export function createFileLedger(dir, now = () => new Date()) {
    const fileFor = (bundle) => join(dir, bundle, `${utcDay(now())}.jsonl`);
    return {
        spentToday: async (bundle) => {
            try {
                const text = await readFile(fileFor(bundle), "utf8");
                return text
                    .split("\n")
                    .filter(Boolean)
                    .map(costOfLine)
                    .reduce((sum, cost) => sum + cost, 0);
            }
            catch (error) {
                if (isNotFound(error))
                    return 0;
                throw error;
            }
        },
        record: async (bundle, records) => {
            if (records.length === 0)
                return;
            const at = now().toISOString();
            const lines = records.map((record) => ({
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
/** In-process ledger (tests, one-off runs): spend per workflow per UTC day of `now`. */
export function createMemoryLedger(now = () => new Date()) {
    const days = new Map();
    const keyOf = (bundle) => `${bundle}/${utcDay(now())}`;
    return {
        spentToday: (bundle) => Promise.resolve(days.get(keyOf(bundle)) ?? 0),
        record: (bundle, records) => {
            const key = keyOf(bundle);
            const spent = records.reduce((sum, record) => sum + record.costUsd, 0);
            days.set(key, (days.get(key) ?? 0) + spent);
            return Promise.resolve();
        },
    };
}
