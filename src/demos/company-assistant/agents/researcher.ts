import { Agent } from "../../../components/index.js";
import { KIMI, KIMI_PRICE } from "../../../bundles/shared.js";
import { CurrentTime } from "../../../tools/index.js";
import { ListDocs, ReadDoc } from "../mcp/docs.js";
import { CompanyDocs } from "../rag/company-docs.js";
import { ExchangeRate } from "../tools/exchange-rate.js";

@Agent({
  name: "researcher",
  description: "Answers from the company docs, the current time and live exchange rates",
  model: KIMI,
  price: KIMI_PRICE,
  tools: [ListDocs, ReadDoc, CurrentTime, ExchangeRate],
  rag: [{ use: CompanyDocs, mode: "tool" }],
  prompt: new URL("./researcher.prompt.md", import.meta.url),
})
export class Researcher {}
