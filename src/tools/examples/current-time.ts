import { z } from "zod";
import { Tool, type ToolHandler } from "../../components/decorators.js";

const CurrentTimeInput = z.object({
  timeZone: z.string().default("UTC").describe("IANA time zone, e.g. Asia/Tokyo"),
});

const CurrentTimeOutput = z.object({ iso: z.string(), timeZone: z.string(), local: z.string() });

/** Example tool: the current time in a time zone. Tests pass their own clock to the constructor. */
@Tool({
  name: "current_time",
  description: "Current date and time in an IANA time zone (default UTC).",
  input: CurrentTimeInput,
  output: CurrentTimeOutput,
})
export class CurrentTime implements ToolHandler<typeof CurrentTimeInput, typeof CurrentTimeOutput> {
  constructor(private readonly now: () => Date = () => new Date()) {}

  run({
    timeZone,
  }: z.output<typeof CurrentTimeInput>): Promise<z.output<typeof CurrentTimeOutput>> {
    const moment = this.now();
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      dateStyle: "full",
      timeStyle: "long",
    }).format(moment);
    return Promise.resolve({ iso: moment.toISOString(), timeZone, local });
  }
}
