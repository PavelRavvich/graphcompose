import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAppDeps } from "../../src/app.js";
import { resolveTools, type BundleServices } from "../../src/bundle.js";
import { bundleNamed, bundles, UnknownBundleError } from "../../src/bundles.js";
import { validateAgentsConfig } from "../../src/config/types.js";
import {
  companyAssistant,
  companyAssistantApproval,
} from "../../src/demos/company-assistant/index.js";
import {
  createExchangeRateTool,
  createNoteTools,
  EXCHANGE_RATE_COST_USD,
} from "../../src/demos/company-assistant/tools.js";
import type { ToolContext } from "../../src/tools/index.js";

const ctx = (costs: number[] = []): ToolContext => ({
  runId: "r",
  bundle: "b",
  agent: "a",
  signal: new AbortController().signal,
  reportCost: (usd) => {
    costs.push(usd);
  },
});

const services: BundleServices = {
  router: (name) => ({ name, route: () => Promise.resolve({ kind: "failed", reason: "unused" }) }),
};

describe("bundles", () => {
  it("every bundle is valid: tools exist, every agent has a prompt", () => {
    for (const bundle of Object.values(bundles)) {
      expect(() =>
        validateAgentsConfig(
          bundle.config,
          resolveTools(bundle, services).map((tool) => tool.name),
        ),
      ).not.toThrow();
      expect(Object.keys(bundle.prompts).sort()).toEqual(Object.keys(bundle.config.agents).sort());
    }
  });

  it("finds bundles by name and rejects unknown ones", () => {
    expect(bundleNamed("company-assistant-approval")).toBe(companyAssistantApproval);
    expect(Object.keys(bundles)).toEqual([
      "default",
      "company-assistant",
      "company-assistant-approval",
      "job-scout",
    ]);
    expect(() => bundleNamed("nope")).toThrow(UnknownBundleError);
  });

  it("only the approval demo turns the pause seam on, for write tools", () => {
    const save = resolveTools(companyAssistantApproval, services).find(
      (tool) => tool.name === "note_save",
    );
    const search = resolveTools(companyAssistantApproval, services).find(
      (tool) => tool.name === "note_search",
    );

    expect(companyAssistant.needsApproval).toBeUndefined();
    expect(save && companyAssistantApproval.needsApproval?.(save)).toBe(true);
    expect(search && companyAssistantApproval.needsApproval?.(search)).toBe(false);
  });

  it("wires a demo bundle against the real filesystem MCP server (contract checked at startup)", async () => {
    const deps = await createAppDeps(
      { OPENROUTER_API_KEY: "k", TERN_DB: ":memory:" },
      undefined,
      companyAssistantApproval,
    );
    try {
      expect(deps.pause).toBeDefined();
      const listed = await deps.tools("docs__list_directory").invoke(
        {
          path: join(import.meta.dirname, "..", "..", "src", "demos", "company-assistant", "docs"),
        },
        ctx(),
      );
      expect(JSON.stringify(listed)).toContain("onboarding.md");
      expect(() => deps.tools("ghost")).toThrow(/Unknown tool/);
    } finally {
      await deps.close();
    }
  }, 30_000);
});

describe("demo tools", () => {
  it("saves notes and finds them", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "notes-")), "notes.json");
    const [search, save] = createNoteTools(file, () => new Date("2026-09-24T10:00:00Z"));

    expect(await search.invoke({ query: "" }, ctx())).toEqual({ kind: "ok", value: [] });
    await save.invoke({ text: "Call Misha on Thursday" }, ctx());
    await save.invoke({ text: "Buy strings" }, ctx());

    const found = await search.invoke({ query: "misha" }, ctx());
    expect(found).toMatchObject({
      kind: "ok",
      value: [{ text: "Call Misha on Thursday", savedAt: "2026-09-24T10:00:00.000Z" }],
    });
  });

  it("reports a broken notes file as a tool error", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "notes-")), "notes.json");
    await writeFile(file, "not json");
    const [search] = createNoteTools(file);

    expect((await search.invoke({ query: "" }, ctx())).kind).toBe("error");
  });

  it("the paid exchange-rate tool reports its cost", async () => {
    const costs: number[] = [];
    const tool = createExchangeRateTool(() =>
      Promise.resolve({ date: "2026-09-24", rates: { EUR: 0.9 } }),
    );

    const result = await tool.invoke({ from: "usd", to: "eur" }, ctx(costs));

    expect(result).toEqual({
      kind: "ok",
      value: { from: "USD", to: "EUR", rate: 0.9, date: "2026-09-24" },
    });
    expect(costs).toEqual([EXCHANGE_RATE_COST_USD]);
  });

  it("an unknown currency is a tool error the model sees", async () => {
    const tool = createExchangeRateTool(() => Promise.resolve({ date: "2026-09-24", rates: {} }));

    expect((await tool.invoke({ from: "USD", to: "XXX" }, ctx())).kind).toBe("error");
  });
});
