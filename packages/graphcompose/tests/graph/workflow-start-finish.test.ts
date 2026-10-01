import { describe, expect, it } from "vitest";
import {
  WorkflowStartText,
  DtoValidationError,
  Text,
  WorkflowFinishText,
} from "../../src/dto/index.js";
import { workflowFinishMetaOf } from "../../src/graph/workflow-finish.decorator.js";
import { WorkflowStart, workflowStartMetaOf } from "../../src/graph/workflow-start.decorator.js";
import { from, type Flow } from "../../src/graph/flow.js";
import { nodeInfoOf } from "../../src/graph/node-kind.js";
import { NotAWorkflowStartError, runAgent, runWorkflowStart } from "../../src/index.js";
import { Alpha, Beta, TestAnswer, TestChat } from "../fixtures/test-flow/test.flow.js";
import { decide, fakeDeps, recordingRouters } from "../helpers.js";

/** A second workflow start: a ticket from a helpdesk webhook (still a chat message for now). */
class Ticket extends WorkflowStartText {
  @Text({ prompt: "the ticket id" })
  id!: string;
}

@WorkflowStart({ name: "ticket", description: "A helpdesk ticket", input: Ticket })
class TicketWorkflowStart {}

/** Each workflow start leads to its own agent. */
const twoStarts: Flow = [
  from(TestChat).to(Alpha),
  from(TicketWorkflowStart).to(Beta),
  from(Alpha, Beta).to(TestAnswer),
];

describe("AC1: minimal @WorkflowStart and @WorkflowFinish", () => {
  it("mark classes as workflow start and workflow finish nodes, with their options", () => {
    expect(nodeInfoOf(TestChat)).toEqual({ kind: "workflow-start", name: "chat" });
    expect(nodeInfoOf(TestAnswer)).toEqual({ kind: "workflow-finish", name: "answer" });
    expect(workflowStartMetaOf(TestChat)?.input).toBe(WorkflowStartText);
    expect(workflowFinishMetaOf(TestAnswer)?.output).toBe(WorkflowFinishText);
  });

  it("runWorkflowStart starts a run at the workflow start; the text is the task, the result names the workflow finish", async () => {
    const deps = fakeDeps({
      "test/router": [decide("alpha"), decide("answer", "done")],
      "test/alpha": ["hello back"],
    });

    const result = await runWorkflowStart(deps, TestChat, { text: "hello" });
    const next = await runWorkflowStart(
      deps,
      TestChat,
      { text: "again" },
      { threadId: result.threadId },
    );

    expect(result).toMatchObject({
      status: "answered",
      answer: "hello back",
      finish: "answer",
    });
    expect(next.threadId).toBe(result.threadId);
  });

  it("checks the input against the workflow start's DTO before any call", async () => {
    const { deps, requests } = recordingRouters(fakeDeps({}));

    await expect(runWorkflowStart(deps, TestChat, { text: "" })).rejects.toBeInstanceOf(
      DtoValidationError,
    );
    expect(requests).toEqual([]);
  });

  it("refuses a class that is not a workflow start", async () => {
    await expect(runWorkflowStart(fakeDeps({}), TestAnswer, { text: "hi" })).rejects.toBeInstanceOf(
      NotAWorkflowStartError,
    );
  });

  it("with several workflow starts, the run starts at the one asked for; a plain task goes to the chat workflow start", async () => {
    const deps = {
      ...fakeDeps({ "test/alpha": ["chat"], "test/beta": ["ticket"] }),
      flow: twoStarts,
    };

    const ticket = await runWorkflowStart(deps, TicketWorkflowStart, {
      text: "printer broken",
      id: "T-1",
    } as Ticket);
    const chat = await runAgent({ task: "hi" }, deps);

    expect(ticket).toMatchObject({ answer: "ticket", route: ["beta"], finish: "answer" });
    expect(chat).toMatchObject({ answer: "chat", route: ["alpha"], finish: "answer" });
  });
});
