import { Agent, Bundle, Rag, type Class } from "../../src/components/index.js";
import type { RagConnector, Retrieval } from "../../src/rag/index.js";
import { testConfig } from "../helpers.js";

/** A connector with fixed passages — any class implementing the contract is a knowledge base. */
@Rag({ name: "handbook", description: "The team handbook", k: 2 })
export class Handbook implements RagConnector {
  readonly queries: string[] = [];
  retrieve(query: string, options: { readonly k: number }): Promise<Retrieval> {
    this.queries.push(query);
    const passages = [
      { source: "oncall.md", text: "On-call starts after the third month." },
      { source: "leave.md", text: "Leave is 25 days a year." },
      { source: "tools.md", text: "Use the #help channel." },
    ];
    return Promise.resolve({ passages: passages.slice(0, options.k), costUsd: 0.0002 });
  }
}

/** Another implementation of the same knowledge base — swapping needs no change elsewhere. */
@Rag({ name: "handbook", description: "The team handbook", k: 2 })
export class HandbookFromApi implements RagConnector {
  retrieve(): Promise<Retrieval> {
    return Promise.resolve({
      passages: [{ source: "api:handbook/42", text: "On-call: month 3." }],
    });
  }
}

const prompt = new URL("../components/fixture/greeter.prompt.md", import.meta.url);
const base = {
  version: "1.0.0",
  defaults: testConfig.defaults,
  budget: testConfig.budget,
  routers: testConfig.routers,
  promptVariables: { language: "English" },
};

export function bundleWith(
  use: typeof Handbook | typeof HandbookFromApi,
  mode: "tool" | "context",
): Class {
  @Agent({
    name: "helper",
    description: "Helps",
    model: "test/alpha",
    price: testConfig.agents.alpha.price,
    rag: [{ use, mode }],
    prompt,
  })
  class Helper {}
  @Bundle({ ...base, name: "handbook-bundle", agents: [Helper] })
  class HandbookBundle {}
  return HandbookBundle;
}
