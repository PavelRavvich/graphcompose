import { z } from "zod";
import { Tool, type ToolHandler } from "../../../components/index.js";
import type { ToolContext } from "../../../tools/index.js";

/** What the demo pretends one exchange-rate lookup costs — to show tool costs in FinOps. */
export const EXCHANGE_RATE_COST_USD = 0.001;

const RatesResponse = z.object({ date: z.string(), rates: z.record(z.string(), z.number()) });
const Input = z.object({ from: z.string().length(3), to: z.string().length(3) });
const Output = z.object({ from: z.string(), to: z.string(), rate: z.number(), date: z.string() });

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Rates service answered ${String(response.status)}`);
  return response.json();
}

/** A paid tool: live rates from frankfurter.app (free), reported to FinOps as if paid. */
@Tool({
  name: "exchange_rate",
  description: "Current exchange rate between two currencies (ISO codes, e.g. USD, EUR, ILS).",
  input: Input,
  output: Output,
})
export class ExchangeRate implements ToolHandler<typeof Input, typeof Output> {
  constructor(private readonly fetchJson: (url: string) => Promise<unknown> = defaultFetchJson) {}

  async run(
    { from, to }: z.output<typeof Input>,
    ctx: ToolContext,
  ): Promise<z.output<typeof Output>> {
    const url = `https://api.frankfurter.app/latest?from=${from.toUpperCase()}&to=${to.toUpperCase()}`;
    const body = RatesResponse.parse(await this.fetchJson(url));
    ctx.reportCost(EXCHANGE_RATE_COST_USD);
    const rate = body.rates[to.toUpperCase()];
    if (rate === undefined) throw new Error(`No rate for ${to}`);
    return { from: from.toUpperCase(), to: to.toUpperCase(), rate, date: body.date };
  }
}
