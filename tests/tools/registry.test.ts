import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createToolRegistry,
  defineTool,
  DuplicateToolError,
  toolRegistry,
  UnknownToolError,
  type ToolName,
} from "../../src/tools/index.js";

const named = <TName extends string>(name: TName) =>
  defineTool({
    name,
    description: "d",
    input: z.object({}),
    output: z.string(),
    run: () => Promise.resolve(""),
  });

describe("tool registry", () => {
  it("knows its tools by a literal union of names", () => {
    const registry = createToolRegistry([named("a"), named("b")]);

    expect(registry.names).toEqual(["a", "b"]);
    expect(registry.get("a").name).toBe("a");
    expect(registry.has("b")).toBe(true);
    expect(registry.has("c")).toBe(false);
  });

  it("rejects duplicate names", () => {
    expect(() => createToolRegistry([named("a"), named("a")])).toThrow(DuplicateToolError);
  });

  it("fails loudly for a name that slipped past the compiler", () => {
    const registry = createToolRegistry([named("a")]);
    const smuggled = "b" as "a";

    expect(() => registry.get(smuggled)).toThrow(UnknownToolError);
  });

  it("ships the example tool in the project catalog", () => {
    const name: ToolName = "current_time";

    expect(toolRegistry.names).toContain(name);
  });
});
