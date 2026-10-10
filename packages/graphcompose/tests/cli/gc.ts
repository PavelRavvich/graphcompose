import { runCli } from "../../src/cli/run-cli.js";

/** One `gc` call in-process: its exit code and everything it wrote. */
export interface GcCall {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export const fixture = (name: string): string =>
  new URL(`../fixtures/${name}`, import.meta.url).pathname;

/** `gc <argv…>` with no API key and no terminal; TypeScript is already compiled by vitest. */
export async function gc(argv: readonly string[], cwd = process.cwd()): Promise<GcCall> {
  let stdout = "";
  let stderr = "";
  const code = await runCli(argv, {
    stdout: { write: (text: string) => (stdout += text) },
    stderr: { write: (text: string) => (stderr += text) },
    env: {},
    cwd,
    stdinIsTTY: false,
    registerTypeScript: false,
  });
  return { code, stdout, stderr };
}

/** The `--json` envelope on stdout (throws when stdout is not exactly one JSON value). */
export const envelope = (call: GcCall): Record<string, unknown> =>
  JSON.parse(call.stdout) as Record<string, unknown>;
