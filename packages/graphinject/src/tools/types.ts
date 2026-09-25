import type { z } from "zod";

/** "write" tools change the outside world (PRs, mail…); confirmation will build on this flag. */
export type ToolEffect = "read" | "write";

/** What a tool may know about the run it serves. */
export interface ToolContext {
  readonly runId: string;
  readonly workflow: string;
  readonly agent: string;
  readonly signal: AbortSignal;
  /** Paid tools report their own cost in USD; it counts against the budgets. */
  readonly reportCost: (usd: number) => void;
}

/** Tool failures are values, not exceptions: the model sees them and can recover. */
export type ToolResult<TOutput> =
  | { readonly kind: "ok"; readonly value: TOutput }
  | { readonly kind: "error"; readonly message: string };

/** One shape for every tool — own functions and MCP facades alike. */
export interface Tool<TName extends string = string, TInput = unknown, TOutput = unknown> {
  readonly name: TName;
  readonly description: string;
  readonly effect: ToolEffect;
  readonly timeoutMs: number;
  readonly input: z.ZodType<TInput>;
  readonly output: z.ZodType<TOutput>;
  readonly invoke: (raw: unknown, ctx: ToolContext) => Promise<ToolResult<TOutput>>;
  /** Who reported costs are billed to (default `tool:<name>`), e.g. `rag:<name>` → category retrieval. */
  readonly costCaller?: string;
}

export type AnyTool = Tool;
