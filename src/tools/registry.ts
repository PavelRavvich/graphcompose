import type { AnyTool } from "./types.js";

export class DuplicateToolError extends Error {
  override name = "DuplicateToolError";
}

export class UnknownToolError extends Error {
  override name = "UnknownToolError";
}

/** All tools of the project; names form a literal union the compiler checks. */
export interface ToolRegistry<TName extends string> {
  readonly names: readonly TName[];
  readonly has: (name: string) => name is TName;
  readonly get: (name: TName) => AnyTool;
}

export type ToolNameOf<TRegistry> = TRegistry extends ToolRegistry<infer TName> ? TName : never;

export function createToolRegistry<const TTools extends readonly AnyTool[]>(
  tools: TTools,
): ToolRegistry<TTools[number]["name"]> {
  const byName = new Map<string, AnyTool>();
  for (const tool of tools) {
    if (byName.has(tool.name)) throw new DuplicateToolError(`Tool "${tool.name}" is defined twice`);
    byName.set(tool.name, tool);
  }
  const has = (name: string): name is TTools[number]["name"] => byName.has(name);
  return {
    names: tools.map((tool): TTools[number]["name"] => tool.name),
    has,
    get: (name) => {
      const tool = byName.get(name);
      if (tool === undefined) throw new UnknownToolError(`Unknown tool "${name}"`);
      return tool;
    },
  };
}
