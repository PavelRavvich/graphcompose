import { z } from "zod";
import { defineTool } from "../define-tool.js";
import type { Tool } from "../types.js";

const CurrentTimeInput = z.object({
  timeZone: z.string().default("UTC").describe("IANA time zone, e.g. Asia/Tokyo"),
});

const CurrentTimeOutput = z.object({
  iso: z.string(),
  timeZone: z.string(),
  local: z.string(),
});

export type CurrentTimeTool = Tool<
  "current_time",
  z.output<typeof CurrentTimeInput>,
  z.output<typeof CurrentTimeOutput>
>;

/** Example tool: the current time in a time zone. The clock is injected for tests. */
export function createCurrentTimeTool(now: () => Date = () => new Date()): CurrentTimeTool {
  return defineTool({
    name: "current_time",
    description: "Current date and time in an IANA time zone (default UTC).",
    input: CurrentTimeInput,
    output: CurrentTimeOutput,
    run: ({ timeZone }) => {
      const moment = now();
      const local = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        dateStyle: "full",
        timeStyle: "long",
      }).format(moment);
      return Promise.resolve({ iso: moment.toISOString(), timeZone, local });
    },
  });
}
