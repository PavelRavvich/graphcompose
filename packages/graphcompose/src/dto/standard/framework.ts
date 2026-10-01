import { Decimal, Flag, ListOf, Nested, Text } from "../decorators.js";
import { markOpen } from "../metadata.js";

/** What a user writes into a chat entry. */
export class ChatMessage {
  @Text({ prompt: "what the user wrote", minLength: 1 })
  text!: string;

  @Text({ prompt: "who wrote it, if the caller knows", optional: true, sensitive: true })
  author?: string;
}

/** A plain text answer — the output of an answer conclusion. */
export class TextAnswer {
  @Text({ prompt: "the answer, in plain words" })
  text!: string;
}

/** What an interrupt asks a person. */
export class Question {
  @Text({ prompt: "the question to ask, in one sentence" })
  question!: string;

  @ListOf(Text, {
    prompt: "answers to choose from, if the choice is closed",
    optional: true,
    maxItems: 6,
  })
  options?: string[];
}

/** A person's answer to a question. */
export class Clarification {
  @Text({ prompt: "the person's answer" })
  answer!: string;
}

/** Any JSON object: the arguments of some tool (internal — not a concept of its own). */
export class ToolArguments {
  readonly [name: string]: unknown;
}
markOpen(ToolArguments);

/** A tool call waiting for a person's approval — one call per pause. */
export class ApprovalRequest {
  @Text({ prompt: "the id of the call being approved" })
  callId!: string;

  @Text({ prompt: "the tool's name" })
  tool!: string;

  @Nested(ToolArguments, { prompt: "the arguments the tool would get" })
  arguments!: ToolArguments;

  @Text({ prompt: "what the call will do, in one sentence a person understands" })
  summary!: string;
}

/** The person's decision on one call. */
export class ApprovalDecision {
  @Flag({ prompt: "true to run the call, false to refuse it" })
  approved!: boolean;

  @Text({ prompt: "who decided" })
  by!: string;

  @Text({ prompt: "why, if the person said", optional: true })
  reason?: string;
}

/**
 * The input of a tool that takes nothing (`{}`). `extends Object` only because an empty class body is a
 * lint error; the class is as plain as `class NoInput {}`.
 */
export class NoInput extends Object {}

/** A piece of knowledge found for an agent. */
export class Passage {
  @Text({ prompt: "the found text" })
  text!: string;

  @Text({ prompt: "where it comes from: a document, a page, a file" })
  source!: string;

  @Decimal({ prompt: "how well it matches the query, from 0 to 1", min: 0, max: 1 })
  score!: number;
}
