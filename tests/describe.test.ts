import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defaultBundle, type AgentBundle } from "../src/bundle.js";
import { describeBundle } from "../src/cli/describe.js";
import { companyAssistantApproval } from "../src/demos/company-assistant/index.js";
import { jobScout } from "../src/demos/job-scout/index.js";
import type { JobScoutToolName } from "../src/demos/job-scout/tools.js";
import { defineTool } from "../src/tools/index.js";

const after = (lines: readonly string[], start: string): string[] => {
  const i = lines.findIndex((line) => line.startsWith(start));
  const next = lines.findIndex((line, j) => j > i && /^ {2}\S/.test(line));
  return lines.slice(i, next < 0 ? undefined : next);
};

describe("describe a bundle", () => {
  it("AC1: which agent can use which tool, with its kind — without keys or network", () => {
    const lines = describeBundle(companyAssistantApproval);

    const notes = after(lines, "  notes");
    const researcher = after(lines, "  researcher");
    expect(notes.some((l) => l.includes("· note_save (write, local, waits for approval)"))).toBe(
      true,
    );
    expect(notes.some((l) => l.includes("· note_search (read, local)"))).toBe(true);
    expect(researcher.some((l) => l.includes("· docs__read_text_file (read, MCP docs)"))).toBe(
      true,
    );
    expect(after(lines, "  coder")).toContain("    tools: none");
  });

  it("AC2: settings of the bundle and of each agent", () => {
    const lines = describeBundle(jobScout);
    const coder = after(describeBundle(defaultBundle), "  coder");

    expect(lines[0]).toBe("job-scout 1.0.0");
    expect(lines).toContain("guards    input: prompt_injection ≥0.7 · output: pii ≥0.7");
    expect(
      lines.some((l) => l.startsWith("memory    compaction every 5 turns, keep 10 summaries")),
    ).toBe(true);
    expect(lines).toContain("pause     off");
    expect(
      lines.some((l) =>
        l.startsWith(
          "  scout  moonshotai/kimi-k2.6 · thinking none · history 8 turns + 10 summaries",
        ),
      ),
    ).toBe(true);
    expect(
      coder.some((l) =>
        l.includes("reasoning: threshold 0.8 · 3 attempts [low, medium, high] · best"),
      ),
    ).toBe(true);
    expect(describeBundle(jobScout, "scout-low-thinking")[0]).toBe(
      "job-scout 1.0.0 (profile scout-low-thinking)",
    );
  });

  it("AC3: tools nobody can use, and tools an agent names but the catalog lacks", () => {
    const extra = defineTool({
      name: "extra",
      description: "Unused.",
      input: z.object({}),
      output: z.string(),
      run: () => Promise.resolve(""),
    });
    const bundle: AgentBundle = {
      ...defaultBundle,
      tools: [...(defaultBundle.tools as readonly never[]), extra],
      config: {
        ...defaultBundle.config,
        agents: {
          ...defaultBundle.config.agents,
          coder: { ...defaultBundle.config.agents.coder, tools: ["ghost"] },
        },
      },
    };

    const lines = describeBundle(bundle);

    expect(lines.at(-1)).toBe("unassigned tools: extra");
    expect(after(lines, "  coder")).toContain("    · ghost (not in the catalog)");
  });

  it("AC4: job-scout's tool-name type comes from its catalog", () => {
    expectTypeOf<JobScoutToolName>().toEqualTypeOf<"read_resume" | "greenhouse_jobs">();
  });
});
