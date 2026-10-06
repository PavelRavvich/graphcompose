const fs = require("fs");

function replaceInFile(path, replacements) {
  let content = fs.readFileSync(path, "utf8");
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  fs.writeFileSync(path, content);
}

replaceInFile("packages/graphcompose/src/pause/types.ts", [
  [
    "export interface PendingApproval extends AgentToolCall {",
    'export type PendingPauseKind = "approval" | "interactive";\n\nexport interface PendingPause extends AgentToolCall {\n  readonly kind: PendingPauseKind;\n  readonly payload?: unknown;',
  ],
]);

replaceInFile("packages/graphcompose/src/pause/index.ts", [["PendingApproval", "PendingPause"]]);

replaceInFile("packages/graphcompose/src/app/types.ts", [["PendingApproval", "PendingPause"]]);

replaceInFile("packages/graphcompose/src/graph/agent-loop/approval.ts", [
  ["PendingApproval", "PendingPause"],
  ["const pending: PendingPause = {", 'const pending: PendingPause = {\n        kind: "approval",'],
]);

replaceInFile("packages/graphcompose/src/run/finish.ts", [["PendingApproval", "PendingPause"]]);

replaceInFile("packages/graphcompose/src/run/paused.ts", [
  ["PendingApproval", "PendingPause"],
  ["PendingApprovalSchema", "PendingPauseSchema"],
  [
    "args: z.unknown(),",
    'args: z.unknown(),\n  kind: z.enum(["approval", "interactive"]).catch("approval"),\n  payload: z.unknown().optional(),',
  ],
]);

replaceInFile("packages/graphcompose/src/run/types.ts", [["PendingApproval", "PendingPause"]]);
