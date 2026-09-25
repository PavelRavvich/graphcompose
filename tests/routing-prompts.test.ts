import { describe, expect, it } from "vitest";
import { FINISH_DESCRIPTION } from "../src/prompts/routing.js";

describe("finish option", () => {
  it("covers answered, waiting for the user, and impossible tasks", () => {
    expect(FINISH_DESCRIPTION).toContain("answer the task");
    expect(FINISH_DESCRIPTION).toContain("asked the user a question and waits for their reply");
    expect(FINISH_DESCRIPTION).toContain("cannot be completed");
  });
});
