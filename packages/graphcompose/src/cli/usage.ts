/** `graphcompose --help`. */
export const USAGE = `GraphCompose — typed agent workflows on LangGraph

Usage: graphcompose <command> --workflow <path> [options]      (short: gc)

  chat        interactive chat with the workflow            [--thread <id>] [--profile <p>]
  run         one task, answer to stdout ("…" as argument)   [--thread <id>] [--profile <p>]
  describe    agents, their tools, knowledge bases, settings (no API key needed)
  eval        score recent runs with Jev                     [--version <v>] [--limit N]
  replay      re-run a prompt version on recent tasks        --version <v> [--limit N]
  golden      save recent real tasks as a golden set         add --name <n> [--from-last N]
  compare     profiles side by side on the same tasks        --profiles base,<p> [--golden <n> | --last N]
  rag:index   build / update the workflow's knowledge bases  [--kb <name>]

--workflow  a module exporting one @Workflow class, e.g. ./src/job-scout.workflow.ts
`;
