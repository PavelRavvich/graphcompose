import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import type { ResolvedModelSettings } from "../config/types.js";
import { asError, TestFailure } from "./errors.js";
import { ModelCallFailedError, type ScriptedTurn } from "./script.js";
import type { ChatLine, ComponentScript, ModelRequest, ScriptBook } from "./script-book.js";

/** Output tokens that cost `usd` at the model's output price (no price → free). */
const tokensFor = (usd: number, settings: ResolvedModelSettings): number =>
  settings.price.outputPerMTok === 0 ? 0 : (usd * 1_000_000) / settings.price.outputPerMTok;

const usageOf = (outputTokens: number) => ({
  input_tokens: 0,
  output_tokens: outputTokens,
  total_tokens: outputTokens,
});

const lineOf = (message: BaseMessage): ChatLine => ({
  role: message.type,
  text: message.text,
});

/** What an agent sent: its system prompt, its input (the first human message), every message. */
export function chatRequestOf(messages: readonly BaseMessage[]): ModelRequest {
  const lines = messages.map(lineOf);
  return {
    kind: "chat",
    system: lines.find((line) => line.role === "system")?.text ?? "",
    input: lines.find((line) => line.role === "human")?.text ?? "",
    messages: lines,
  };
}

/** One scripted turn as the model's reply. */
function replyOf(
  turn: ScriptedTurn,
  script: ComponentScript,
  book: ScriptBook,
  settings: ResolvedModelSettings,
): AIMessage {
  switch (turn.kind) {
    case "answer":
      return new AIMessage({
        content: turn.text,
        usage_metadata: usageOf(tokensFor(turn.details.cost ?? 0, settings)),
        response_metadata: turn.details.truncated === true ? { finish_reason: "length" } : {},
      });
    case "tool-call":
      script.toolCalls.push(turn.tool);
      return new AIMessage({
        content: "",
        usage_metadata: usageOf(0),
        tool_calls: [{ id: book.nextToolCallId(), name: turn.tool, args: { ...turn.args } }],
      });
    case "failure":
      throw new ModelCallFailedError(turn.failure, script.label);
    case "decision":
      throw new TestFailure(
        "test.wrong-script",
        `${script.label} is not a router: script it with answer(…) / callTool(…), not decide(…)`,
      );
  }
}

/**
 * A chat model that answers by its component's script — by position, never by call order across
 * components — and records every request. Tool calling works (`createAgent` binds tools to it).
 */
export class ScriptedChatModel extends BaseChatModel {
  constructor(
    private readonly book: ScriptBook,
    private readonly key: string,
    private readonly settings: ResolvedModelSettings,
  ) {
    super({});
  }

  _llmType(): string {
    return "scripted";
  }

  override bindTools(): this {
    return this;
  }

  _generate(messages: BaseMessage[]): Promise<ChatResult> {
    const script = this.book.scriptOf(this.key);
    script.requests.push(chatRequestOf(messages));
    try {
      const message = replyOf(script.next(), script, this.book, this.settings);
      return Promise.resolve({ generations: [{ text: message.text, message }] });
    } catch (error) {
      if (error instanceof TestFailure) this.book.report(error);
      return Promise.reject(asError(error));
    }
  }
}
