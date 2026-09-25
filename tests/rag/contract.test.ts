import { describe, expect, it } from "vitest";
import type { BundleServices } from "../../src/bundle.js";
import { resolveTools } from "../../src/bundle.js";
import { bundleOf } from "../../src/components/index.js";
import { describeBundle } from "../../src/cli/describe.js";
import type { ToolContext } from "../../src/tools/index.js";
import { bundleWith, Handbook, HandbookFromApi } from "./fixture.js";

const services: BundleServices = {
  router: (name) => ({ name, route: () => Promise.reject(new Error("unused")) }),
  env: {},
};
const costs: number[] = [];
const ctx: ToolContext = {
  runId: "r",
  bundle: "b",
  agent: "helper",
  signal: new AbortController().signal,
  reportCost: (usd) => {
    costs.push(usd);
  },
};

describe("knowledge bases — contract", () => {
  it("AC1, AC5: any class implementing the contract, annotated @Rag and bound by an agent, is a knowledge base", async () => {
    const bundle = await bundleOf(bundleWith(Handbook, "tool"));
    const search = resolveTools(bundle, services).find((tool) => tool.name === "search_handbook");

    expect(bundle.config.agents.helper).toMatchObject({
      tools: ["search_handbook"],
      rag: [{ name: "handbook", mode: "tool", k: 2 }],
    });
    expect(search?.costCaller).toBe("rag:handbook");
    expect(await search?.invoke({ query: "on-call" }, ctx)).toEqual({
      kind: "ok",
      value: {
        passages: [
          { source: "oncall.md", text: "On-call starts after the third month." },
          { source: "leave.md", text: "Leave is 25 days a year." },
        ],
      },
    });
    expect(costs).toEqual([0.0002]);
    expect(describeBundle(bundle)).toContain("    rag: handbook (tool, k 2)");
  });

  it("AC1: context mode gives the agent a source retrieving top-k; the index list has every base", async () => {
    const bundle = await bundleOf(bundleWith(Handbook, "context"));
    const [source] = bundle.knowledge?.(services).get("helper") ?? [];

    expect(bundle.config.agents.helper?.tools).toEqual([]);
    expect(source?.k).toBe(2);
    expect((await source?.retrieve("q", { k: 1, signal: ctx.signal }))?.passages).toHaveLength(1);
    expect(bundle.knowledgeBases?.(services).map((kb) => kb.name)).toEqual(["handbook"]);
  });

  it("AC4: swapping the implementation changes nothing outside the knowledge base", async () => {
    const a = await bundleOf(bundleWith(Handbook, "tool"));
    const b = await bundleOf(bundleWith(HandbookFromApi, "tool"));
    const searchB = resolveTools(b, services).find((tool) => tool.name === "search_handbook");

    expect(b.config.agents).toEqual(a.config.agents);
    expect(await searchB?.invoke({ query: "on-call" }, ctx)).toEqual({
      kind: "ok",
      value: { passages: [{ source: "api:handbook/42", text: "On-call: month 3." }] },
    });
  });
  it("AC5: a class in an agent's rag that is not a @Rag fails assembly with its name", async () => {
    class NotRag {
      readonly plain = true;
    }

    await expect(bundleOf(bundleWith(NotRag as never, "tool"))).rejects.toThrow(
      /NotRag in an agent's rag is not a @Rag/,
    );
  });
});
