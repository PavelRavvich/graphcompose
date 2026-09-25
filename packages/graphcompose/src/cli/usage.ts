/** One description of every command: `gc help` and `gc help <command>` are built from it. */
interface CommandHelp {
  readonly summary: string;
  readonly usage: string;
  readonly options: readonly (readonly [string, string])[];
}

const WORKFLOW: readonly [string, string] = [
  "--workflow <path>",
  "a module exporting one @Workflow class (default ./src/workflow.ts)",
];
const PROFILE: readonly [string, string] = [
  "--profile <name>",
  "apply profiles/<workflow>/<name>.yaml",
];
const THREAD: readonly [string, string] = ["--thread <id>", "continue a conversation"];

export const COMMANDS: Readonly<Record<string, CommandHelp>> = {
  chat: {
    summary: "interactive chat with the workflow",
    usage: "gc chat --workflow <path> [--thread <id>] [--profile <name>]",
    options: [WORKFLOW, THREAD, PROFILE],
  },
  run: {
    summary: "one task, the answer to stdout",
    usage: 'gc run --workflow <path> [--thread <id>] [--profile <name>] "<task>"',
    options: [WORKFLOW, THREAD, PROFILE],
  },
  describe: {
    summary: "agents, their tools, knowledge bases and settings (no API key needed)",
    usage: "gc describe --workflow <path> [--profile <name>]",
    options: [WORKFLOW, PROFILE],
  },
  eval: {
    summary: "score recent runs with Jev",
    usage: "gc eval --workflow <path> [--version <v>] [--limit N] [--profile <name>]",
    options: [
      WORKFLOW,
      ["--version <v>", "only runs of this prompt version"],
      ["--limit N", "how many runs (default 100)"],
      PROFILE,
    ],
  },
  replay: {
    summary: "re-run a prompt version on recent tasks",
    usage: "gc replay --workflow <path> --version <v> [--limit N] [--profile <name>]",
    options: [
      WORKFLOW,
      ["--version <v>", "the prompt version to replay (required)"],
      ["--limit N", "how many tasks (default 100)"],
      PROFILE,
    ],
  },
  golden: {
    summary: "save recent real tasks as a golden set",
    usage: "gc golden add --workflow <path> --name <name> [--from-last N]",
    options: [
      WORKFLOW,
      ["--name <name>", "the set: golden/<workflow>/<name>.yaml (required)"],
      ["--from-last N", "how many recent tasks (default 20)"],
    ],
  },
  compare: {
    summary: "profiles side by side on the same tasks",
    usage: "gc compare --workflow <path> --profiles base,<p>… [--golden <name> | --last N]",
    options: [
      WORKFLOW,
      ["--profiles <list>", "comma-separated; the first is the baseline (base = no profile)"],
      ["--golden <name>", "the tasks of a golden set"],
      ["--last N", "or the last N real tasks (default 20)"],
    ],
  },
  "rag:index": {
    summary: "build / update the workflow's knowledge bases",
    usage: "gc rag:index --workflow <path> [--kb <name>]",
    options: [WORKFLOW, ["--kb <name>", "only this knowledge base"]],
  },
  create: {
    summary: "a new project from a short questionnaire (alias c)",
    usage:
      'gc create <name> [--agents "a:role,…"] [--tools "a:tool,…"] [--mcp …] [--rag …] [--yes] [--skip-install]',
    options: [
      ["--agents <list>", 'agents and roles: "triage:Sorts requests,answerer:Answers"'],
      ["--tools <list>", 'tools per agent: "answerer:search_orders,answerer:refund"'],
      ["--mcp <spec>", "none | filesystem:<dir> | command:<cmd>:<tool>"],
      ["--rag <folder>", "none | a folder of notes to search"],
      ["--yes, -y", "no questions: defaults for anything not given"],
      ["--skip-install", "do not run npm install"],
    ],
  },
  generate: {
    summary: "add a workflow, agent, tool, MCP server or knowledge base, wired (alias g)",
    usage: "gc generate <workflow|agent|tool|mcp|rag> <name> [--workflow <path>] [options]",
    options: [
      ["--workflow <path>", "the workflow to add to (src/<name>/<name>.workflow.ts)"],
      ["--agent <name>", "the agent that uses the tool / MCP tool / knowledge base"],
      ["--description <text>", "an agent's role"],
      ["--dir <folder>", "mcp: a filesystem server over this folder"],
      ["--command <cmd>", "mcp: a server started with this command (with --tool <name>)"],
      ["--folder <dir>", "rag: the folder of notes"],
    ],
  },
  help: {
    summary: "this list, or one command's options",
    usage: "gc help [<command>]",
    options: [],
  },
};

const pad = (text: string, width: number): string => text.padEnd(width);

/** `gc help`: every operation. */
export function usage(): string {
  const lines = Object.entries(COMMANDS).map(
    ([name, command]) => `  ${pad(name, 11)} ${command.summary}`,
  );
  return `GraphCompose — typed agent workflows on LangGraph

Usage: graphcompose <command> [options]      (short: gc)

${lines.join("\n")}

Every command takes --workflow <path>: a module exporting one @Workflow class.
gc help <command> — its options.
`;
}

/** `gc help <command>`; undefined for an unknown command. */
export function helpFor(name: string): string | undefined {
  const command = COMMANDS[name];
  if (command === undefined) return undefined;
  const width = Math.max(0, ...command.options.map(([flag]) => flag.length));
  const options = command.options
    .map(([flag, text]) => `  ${pad(flag, width)}  ${text}`)
    .join("\n");
  return `gc ${name} — ${command.summary}\n\nUsage: ${command.usage}\n${options === "" ? "" : `\nOptions:\n${options}\n`}`;
}

/** Kept for `--help` and older imports. */
export const USAGE = usage();
