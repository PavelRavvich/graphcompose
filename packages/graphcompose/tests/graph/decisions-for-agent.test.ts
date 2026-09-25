import { describe, expect, it } from "vitest";
import { formatDecisionsForAgent } from "../../src/graph/contributions.js";
import { renderAgentInput } from "../../src/prompts/agents.js";

const write = {
  agent: "shortlist",
  tool: "shortlist__write_file",
  args: { path: "/s.md", content: "x".repeat(500) },
  approved: true,
  result: "Successfully wrote to /s.md",
};
const rejected = {
  agent: "shortlist",
  tool: "shortlist__write_file",
  args: { path: "/s.md" },
  approved: false,
  result: "Rejected by a human",
};

describe("an agent after a pause sees the human decisions on its own tool calls (#92)", () => {
  it("approved: done, with the tool's result; rejected: not done; other agents' calls left out", () => {
    const text = formatDecisionsForAgent(
      [write, rejected, { ...write, agent: "scout" }],
      "shortlist",
    );

    expect(text).toContain("approved by a human and DONE — result: Successfully wrote to /s.md");
    expect(text).toContain("rejected by a human, NOT done — Rejected by a human");
    expect(text.match(/shortlist__write_file/g)).toHaveLength(2);
    expect(text.length).toBeLessThan(900);
    expect(formatDecisionsForAgent([], "shortlist")).toBe("");
  });

  it("the agent's input ends with them", () => {
    expect(renderAgentInput("save 1", "(none)", "", "\n\nYour tool calls…")).toBe(
      "Task:\nsave 1\n\nPrevious contributions:\n(none)\n\nYour tool calls…",
    );
  });
});
