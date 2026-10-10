import { frameworkPackageJson } from "graphcompose/internal";
import { z } from "zod";

/** Where a public name lives now (#195): its entry and, when it was renamed, its new name. */
export interface Move {
  readonly entry: string;
  readonly name?: string;
}

/** What `gc migrate imports` rewrites: whole entries that moved, and single names. */
export interface ImportMoves {
  /** A deprecated entry → the entry that replaced it: `"graphcompose/core"` → `"graphcompose"`. */
  readonly entries: Readonly<Record<string, string>>;
  /** Names that moved on their own or were renamed, by the entry they were imported from. */
  readonly names: Readonly<Record<string, Readonly<Record<string, Move>>>>;
}

const FrameworkPackage = z.object({
  name: z.string(),
  deprecatedExports: z.record(z.string(), z.string()).default({}),
});

/** `"./core"` → `"graphcompose/core"`, `"."` → `"graphcompose"`. */
const specifierOf = (name: string, subpath: string): string =>
  subpath === "." ? name : `${name}/${subpath.replace(/^\.\//, "")}`;

/** One name per meaning (#195): the public names that were renamed or left the root entry. */
const RENAMED: ImportMoves["names"] = {
  "graphcompose/core": { Router: { entry: "graphcompose", name: "RouterEngine" } },
  graphcompose: {
    McpServer: { entry: "graphcompose/mcp", name: "McpExpose" },
    McpServerOptions: { entry: "graphcompose/mcp", name: "McpExposeOptions" },
    McpService: { entry: "graphcompose/mcp" },
    McpSession: { entry: "graphcompose/mcp" },
    createMcpService: { entry: "graphcompose/mcp" },
  },
  "graphcompose/testing": { Duration: { entry: "graphcompose/testing", name: "ClockDuration" } },
};

/** The moves of the installed framework: its package.json's `deprecatedExports` + renames. */
export function frameworkMoves(): ImportMoves {
  const pkg = FrameworkPackage.parse(frameworkPackageJson());
  const entries = Object.fromEntries(
    Object.entries(pkg.deprecatedExports).map(([from, to]) => [
      specifierOf(pkg.name, from),
      specifierOf(pkg.name, to),
    ]),
  );
  return { entries, names: RENAMED };
}

/** Where `name`, imported from `entry`, lives now; undefined when it did not move. */
export function moveOf(moves: ImportMoves, entry: string, name: string): Move | undefined {
  const renamed = moves.names[entry]?.[name];
  if (renamed !== undefined) return renamed;
  const replacement = moves.entries[entry];
  return replacement === undefined ? undefined : { entry: replacement };
}
