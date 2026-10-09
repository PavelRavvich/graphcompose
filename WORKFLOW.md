# WORKFLOW

How work moves from a requirement to accepted code.

## Where things live — no specs, plans or docs as files in the repo

| Kind of knowledge                                       | Place                                            |
| ------------------------------------------------------- | ------------------------------------------------ |
| Work items, discussion, **specs, implementation plans** | GitHub Issues of this repo (body + comments)     |
| **Stage of every ticket**                               | GitHub Project board of the repo, field `Status` |
| How the system works now                                | **GitHub Wiki** of this repo                     |
| Why a significant decision was made                     | Wiki pages `ADR-NNNN-Title`                      |
| Rules                                                   | `QUALITY.md`, `WORKFLOW.md`, `CLAUDE.md`         |

- Issue and PR bodies are passed to `gh` via stdin (`--body-file -`), never through files.
- The Wiki is a separate git repo; its working copy is `../<repo>.wiki`, managed by
  `scripts/wiki.sh` (`pull`, `publish`, `seed`).
- Board and stages are managed by `scripts/ticket.sh` (`setup`, `status`, `list`, `sub`).

## The conveyor

| Stage (board `Status`) | Set by                          | Means                                                                                               |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Triage**             | `triage` skill                  | business side clarified: why, what it does, what it does not, constraints, acceptance criteria AC1… |
| **Backlog**            | `spec-session` skill            | spec, implementation plan, tests and manual checks mapped to every business AC                      |
| **In progress**        | `implement` skill (start)       | branch exists, work under way                                                                       |
| **Test**               | `implement` skill (after merge) | merged to `dev`, manual acceptance instructions posted on the issue                                 |
| **Done**               | **a human only**                | accepted; the human also closes the issue                                                           |

- Every skill moves the ticket to its own stage when it finishes.
- Triage and spec are **quiz-driven** (`.claude/skills/QUIZ.md`) and run in parallel sessions:
  every question restates the ticket, an example situation and the price of each option.
- Implementation runs independent tickets in parallel (worktrees + sub-agents, or Claude Code on
  the web), dependent ones in order.
- A ticket that cannot proceed gets the label `blocked` and a comment (what is known, what blocks,
  what is needed); its stage does not change.
- Large work: a parent issue (`type:epic`) with sub-issues (`scripts/ticket.sh sub`).

## Labels

`type:feature` · `type:bugfix` · `type:chore` · `type:epic` · `prio:mvp` · `prio:stretch` ·
`blocked`. Stages are **not** labels — they are the board `Status`.

## Branch model

```
production  ← released code
   ↑ PR
staging     ← pre-release verification
   ↑ PR
dev         ← integration branch; all work branches start and end here
   ↑ PR (squash)
<type>-<issue>
```

- Work branches are created from `dev` and merged back into `dev` via PR.
- Promotion `dev → staging → production` is a release activity, done by PR, never by the agent.
- Nobody pushes directly to `dev`, `staging`, `production`.

## Branch naming

`<type>-<issue>` — e.g. `feature-12`, `bugfix-13`, `chore-14`. Nothing else in the name.

## Commits

Conventional commits with the issue number: `feat(#12): …`, `fix(#13): …`, `test(#12): …`,
`chore(#14): …`. Small commits are fine; the PR is squash-merged.

## Pull requests

- Base: `dev`. Title: `<type>-<issue>: <issue title>`.
- Body follows `.github/pull_request_template.md` and says **`Refs #<issue>`** — never `Closes`:
  merging must not close the issue, because acceptance happens in Test.
- One PR per issue. No drive-by changes outside the issue scope — open a new issue instead.
- Merge: squash, delete branch, after `make check` / CI is green.

## Definition of Done (for the agent: ready for Test)

- [ ] Every business acceptance criterion (AC) is proven by a passing test or a manual check
- [ ] All automated acceptance criteria are tests, and they pass
- [ ] `make check` green (types, lint, format, coverage ≥ 80%)
- [ ] Self-review against `QUALITY.md` done
- [ ] "Wiki to update" applied and published (ADR page if a significant decision was made)
- [ ] PR merged to `dev`; ticket moved to **Test**; handoff comment with the manual acceptance
      checklist posted on the issue
- [ ] **Crucial Rule:** The GitHub CI must pass successfully (green) before starting any work on the next ticket. We do not accumulate CI problems or technical debt.

**Done** is the human's call after the manual checklist passes.

## Tool Call Approvals (Channels)

The `@Channel` decorator provides a unified way to handle human-in-the-loop and out-of-band tool call approvals. It decouples the workflow's business logic from the specific mechanism (CLI, Slack, Webhooks, gRPC) used to obtain the approval.

### 1. Define a Channel

A channel is a class that implements `ChannelHandler`. It must provide a `requestApproval` method that takes a `ChannelRequest` and returns `void`.

```typescript
import { Channel, type ChannelHandler, type ChannelRequest } from "graphcompose";

@Channel({
  name: "slack_approval",
  description: "Sends an approval request to a Slack channel.",
})
export class SlackChannel implements ChannelHandler {
  async requestApproval(req: ChannelRequest): Promise<void> {
    // req contains: runId, agentName, toolName, toolArguments, summary, metadata
    console.log(`Sending slack message for run ${req.runId} to approve ${req.toolName}`);
    // You can pass req.metadata.approverEmail to direct the message to a specific user.
  }
}
```

### 2. Attach the Channel to a Tool

Use the `channel` property in the `@Tool` decorator to specify which channel should handle approvals for this tool.

```typescript
@Tool({
  name: "delete_user",
  description: "Deletes a user account.",
  channel: "slack_approval", // This tool will trigger an interrupt!
})
export class DeleteUserTool {
  // ...
}
```

### 3. Provide Metadata and Execute

When starting the graph, you can pass arbitrary context (like user ID, tenant, etc.) using the `metadata` parameter. This metadata is seamlessly passed to the `requestApproval` method of your channel.

```typescript
const result = await app.execute(
  { task: "Delete user 123" },
  { metadata: { approverEmail: "admin@example.com" } },
);
```

### 4. Resume the Run

Once the approval is obtained out-of-band (e.g., the user clicks "Approve" in Slack), resume the run by providing a `ChannelDecision` payload.

```typescript
// Approve as-is
await app.resume(runId, {
  approved: true,
  by: "admin@example.com",
});

// Reject with feedback for the LLM
await app.resume(runId, {
  approved: false,
  by: "admin@example.com",
  feedback: "Please double check the user ID, 123 belongs to the CEO.",
});

// Approve but override the arguments (bypassing the LLM)
await app.resume(runId, {
  approved: true,
  by: "admin@example.com",
  overrideArguments: { userId: "456" }, // Corrected argument!
});
```

### Important Concepts

- **Override Arguments**: If the user modifies the tool arguments during the approval step, returning `overrideArguments` in the decision will inject those modified arguments straight into the tool, bypassing the LLM.
- **Timeouts and Rejections**: Channels are asynchronous fire-and-forget mechanisms. If a run should timeout, use an external cron job or scheduler to call `app.resume(runId, { approved: false, feedback: "Timeout" })`.
