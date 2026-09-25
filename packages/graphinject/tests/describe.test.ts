import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeBundle } from "../src/cli/describe.js";
import { workflowOf } from "../src/components/index.js";
import { defineTool } from "../src/tools/index.js";
import { resolveTools, type AssembledWorkflow } from "../src/workflow.js";
import { Greetings } from "./components/fixture/components.js";
import { TestWorkflow } from "./fixtures/test-workflow/test.workflow.js";

const test = await workflowOf(TestWorkflow);
const greetings = await workflowOf(Greetings);

const after = (lines: readonly string[], start: string): string[] => {
  const i = lines.findIndex((line) => line.startsWith(start));
  const next = lines.findIndex((line, j) => j > i && /^ {2}\S/.test(line));
  return lines.slice(i, next < 0 ? undefined : next);
};

describe("describe a workflow", () => {
  it("AC1: which agent can use which tool, with its kind and constructor dependencies — no keys, no network", () => {
    const lines = after(describeBundle(greetings), "  greeter");

    expect(
      lines.some((l) => l.includes("· greet (read, local) ← Greeter (GREETING, ROUTER_FACTORY)")),
    ).toBe(true);
    expect(lines.some((l) => l.includes("· files__read (read, MCP files)"))).toBe(true);
    expect(after(describeBundle(test), "  coder")).toContain("    tools: none");
  });

  it("AC1: marks tools that wait for a human when the pause seam is on", () => {
    const paused: AssembledWorkflow = {
      ...greetings,
      needsApproval: (tool) => tool.name === "greet",
    };

    expect(
      describeBundle(paused).some((l) => l.includes("· greet (read, local, waits for approval)")),
    ).toBe(true);
    expect(describeBundle(paused)).toContain("pause     on — marked tools wait for a human");
  });

  it("AC2: settings of the workflow and of each agent; the profile in the header", () => {
    const lines = describeBundle(test);

    expect(lines[0]).toBe("test-workflow 1.0.0");
    expect(lines).toContain("guards    input: prompt_injection ≥0.7 · output: pii ≥0.7");
    expect(lines).toContain("memory    raw turns only");
    expect(
      lines.some((l) =>
        l.startsWith(
          "  researcher  test/researcher · thinking default · no output ceiling · history 5 turns",
        ),
      ),
    ).toBe(true);
    expect(
      after(lines, "  coder").some((l) =>
        l.includes("reasoning: threshold 0.8 · 3 attempts [low, medium, high] · best"),
      ),
    ).toBe(true);
    expect(describeBundle(test, "fast")[0]).toBe("test-workflow 1.0.0 (profile fast)");
  });

  it("AC3: tools nobody can use, and tools an agent names but the catalog lacks", () => {
    const extra = defineTool({
      name: "extra",
      description: "Unused.",
      input: z.object({}),
      output: z.string(),
      run: () => Promise.resolve(""),
    });
    const coder = test.config.agents.coder;
    if (coder === undefined) throw new Error("the test workflow has a coder");
    const workflow: AssembledWorkflow = {
      ...test,
      tools: (services) => [...resolveTools(test, services), extra],
      config: {
        ...test.config,
        agents: { ...test.config.agents, coder: { ...coder, tools: ["ghost"] } },
      },
    };

    const lines = describeBundle(workflow);

    expect(lines.at(-1)).toBe("unassigned tools: extra");
    expect(after(lines, "  coder")).toContain("    · ghost (not in the catalog)");
  });
  it("AC3 (#97): each agent shows its output ceiling and provider preference", () => {
    const coder = test.config.agents.coder;
    if (coder === undefined) throw new Error("the test workflow has a coder");
    const workflow: AssembledWorkflow = {
      ...test,
      config: {
        ...test.config,
        defaults: {
          ...test.config.defaults,
          chat: { ...test.config.defaults.chat, provider: { ignore: ["Inceptron"] } },
        },
        agents: {
          ...test.config.agents,
          coder: { ...coder, maxTokens: 4000, provider: { sort: "latency" } },
        },
      },
    };
    const lines = describeBundle(workflow);

    expect(
      lines.some(
        (l) =>
          l.startsWith("  researcher") &&
          l.includes("no output ceiling") &&
          l.includes("providers: ignore Inceptron"),
      ),
    ).toBe(true);
    expect(
      lines.some(
        (l) =>
          l.startsWith("  coder") &&
          l.includes("max 4000 tokens") &&
          l.includes("providers: sort by latency"),
      ),
    ).toBe(true);
  });
});
