import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";
import { asError, TestFailure } from "./errors.js";
import { ModelCallFailedError } from "./script.js";
import { extractText } from "../graph/multimodal.js";
/** Output tokens that cost `usd` at the model's output price (no price or a free model → none). */
const tokensFor = (usd, settings) =>
  settings.price === undefined || settings.price.outputPerMTok === 0
    ? 0
    : (usd * 1_000_000) / settings.price.outputPerMTok;
/** A model without a price reports its cost in the replyWith, as the provider would. */
const costMetadataOf = (usd, settings) =>
  settings.price === undefined ? { usage: { cost: usd } } : {};
const usageOf = (outputTokens) => ({
  input_tokens: 0,
  output_tokens: outputTokens,
  total_tokens: outputTokens,
});
const lineOf = (message) => ({
  role: message.type,
  text: message.content,
});
/** What an agent sent: its system prompt, its input (the first human message), every message. */
export function chatRequestOf(messages) {
  const lines = messages.map(lineOf);
  return {
    kind: "chat",
    system: (() => {
      const sys = lines.find((line) => line.role === "system")?.text;
      return sys ? extractText(sys) : "";
    })(),
    input: lines.find((line) => line.role === "human")?.text ?? "",
    messages: lines,
  };
}
/** One scripted turn as the model's reply. */
function replyOf(turn, script, book, settings) {
  switch (turn.kind) {
    case "replyWith":
      return new AIMessage({
        content: turn.text,
        usage_metadata: usageOf(tokensFor(turn.details.cost ?? 0, settings)),
        response_metadata: {
          ...costMetadataOf(turn.details.cost ?? 0, settings),
          ...(turn.details.truncated === true ? { finish_reason: "length" } : {}),
        },
      });
    case "tool-call":
      script.toolCalls.push(turn.tool);
      return new AIMessage({
        content: "",
        usage_metadata: usageOf(0),
        response_metadata: costMetadataOf(0, settings),
        tool_calls: [{ id: book.nextToolCallId(), name: turn.tool, args: { ...turn.args } }],
      });
    case "failure":
      throw new ModelCallFailedError(turn.failure, script.label);
    case "decision":
      throw new TestFailure(
        "test.wrong-script",
        `${script.label} is not a router: script it with replyWith(…) / callTool(…), not routeTo(…)`,
      );
  }
}
/**
 * A chat model that answers by its component's script — by position, never by call order across
 * components — and records every request. Tool calling works (`createAgent` binds tools to it).
 */
export class ScriptedChatModel extends BaseChatModel {
  book;
  key;
  settings;
  constructor(book, key, settings) {
    super({});
    this.book = book;
    this.key = key;
    this.settings = settings;
  }
  _llmType() {
    return "scripted";
  }
  bindTools() {
    return this;
  }
  _generate(messages) {
    const script = this.book.scriptOf(this.key);
    const req = chatRequestOf(messages);
    script.requests.push(req);
    try {
      const message = replyOf(script.next(req), script, this.book, this.settings);
      return Promise.resolve({ generations: [{ text: message.text, message }] });
    } catch (error) {
      if (error instanceof TestFailure) this.book.report(error);
      return Promise.reject(asError(error));
    }
  }
}
