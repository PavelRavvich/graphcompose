import { describe, expect, it } from "vitest";
import { ChatMessage, DtoValidationError, Text, TextAnswer } from "../../src/dto/index.js";
import { conclusionMetaOf } from "../../src/graph/conclusion.decorator.js";
import { Entry, entryMetaOf } from "../../src/graph/entry.decorator.js";
import { from, type Flow } from "../../src/graph/flow.js";
import { nodeInfoOf } from "../../src/graph/node-kind.js";
import { NotAnEntryError, runAgent, runEntry } from "../../src/index.js";
import { Alpha, Beta, TestAnswer, TestChat } from "../fixtures/test-flow/test.flow.js";
import { decide, fakeDeps, recordingRouters } from "../helpers.js";

/** A second entry: a ticket from a helpdesk webhook (still a chat message for now). */
class Ticket extends ChatMessage {
  @Text({ prompt: "the ticket id" })
  id!: string;
}

@Entry({ name: "ticket", description: "A helpdesk ticket", input: Ticket })
class TicketEntry {}

/** Each entry leads to its own agent. */
const twoEntries: Flow = [
  from(TestChat).to(Alpha),
  from(TicketEntry).to(Beta),
  from(Alpha, Beta).to(TestAnswer),
];

describe("AC1: minimal @Entry and @Conclusion", () => {
  it("mark classes as entry and conclusion nodes, with their options", () => {
    expect(nodeInfoOf(TestChat)).toEqual({ kind: "entry", name: "chat" });
    expect(nodeInfoOf(TestAnswer)).toEqual({ kind: "conclusion", name: "answer" });
    expect(entryMetaOf(TestChat)?.input).toBe(ChatMessage);
    expect(conclusionMetaOf(TestAnswer)?.output).toBe(TextAnswer);
  });

  it("runEntry starts a run at the entry; the text is the task, the result names the conclusion", async () => {
    const deps = fakeDeps({
      "test/router": [decide("alpha"), decide("answer", "done")],
      "test/alpha": ["hello back"],
    });

    const result = await runEntry(deps, TestChat, { text: "hello" });
    const next = await runEntry(deps, TestChat, { text: "again" }, { threadId: result.threadId });

    expect(result).toMatchObject({
      status: "answered",
      answer: "hello back",
      conclusion: "answer",
    });
    expect(next.threadId).toBe(result.threadId);
  });

  it("checks the input against the entry's DTO before any call", async () => {
    const { deps, requests } = recordingRouters(fakeDeps({}));

    await expect(runEntry(deps, TestChat, { text: "" })).rejects.toBeInstanceOf(DtoValidationError);
    expect(requests).toEqual([]);
  });

  it("refuses a class that is not an entry", async () => {
    await expect(runEntry(fakeDeps({}), TestAnswer, { text: "hi" })).rejects.toBeInstanceOf(
      NotAnEntryError,
    );
  });

  it("with several entries, the run starts at the one asked for; a plain task goes to the chat entry", async () => {
    const deps = {
      ...fakeDeps({ "test/alpha": ["chat"], "test/beta": ["ticket"] }),
      flow: twoEntries,
    };

    const ticket = await runEntry(deps, TicketEntry, {
      text: "printer broken",
      id: "T-1",
    } as Ticket);
    const chat = await runAgent({ task: "hi" }, deps);

    expect(ticket).toMatchObject({ answer: "ticket", route: ["beta"], conclusion: "answer" });
    expect(chat).toMatchObject({ answer: "chat", route: ["alpha"], conclusion: "answer" });
  });
});
