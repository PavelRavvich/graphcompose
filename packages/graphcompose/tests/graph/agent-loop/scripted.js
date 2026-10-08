/** The agent loop's test script: moves picked by the conversation, and tools that log their effects. */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { defineTool } from "../../../src/tools/index.js";
export const replyWith = (text) => ({ kind: "replyWith", text });
export const callTools = (...calls) => ({ kind: "calls", calls });
export const read = (id, path) => ({
    id,
    name: "read_file",
    args: { path },
});
export const write = (id, path, content = "x") => ({
    id,
    name: "write_file",
    args: { path, content },
});
export const wait = (id, ms) => ({ id, name: "wait", args: { ms } });
const USAGE = { input_tokens: 100, output_tokens: 20, total_tokens: 120 };
const messageOf = (move) => move.kind === "replyWith"
    ? new AIMessage({ content: move.text, usage_metadata: USAGE })
    : new AIMessage({
        content: "",
        usage_metadata: USAGE,
        tool_calls: move.calls.map((call) => ({ ...call, type: "tool_call" })),
    });
/**
 * Picks the move by the conversation — how many moves the model made so far — never by call order,
 * so a process that resumes a run continues the same script.
 */
export class ConversationModel extends BaseChatModel {
    moves;
    onCall;
    sent = [];
    constructor(moves, onCall = () => undefined) {
        super({});
        this.moves = moves;
        this.onCall = onCall;
    }
    _llmType() {
        return "conversation-scripted";
    }
    bindTools() {
        return this;
    }
    _generate(messages) {
        const index = messages.filter((message) => AIMessage.isInstance(message)).length;
        this.sent.push(messages);
        this.onCall(index);
        const move = this.moves[index];
        if (move === undefined)
            return Promise.reject(new Error(`no scripted move #${String(index)}`));
        const message = messageOf(move);
        return Promise.resolve({ generations: [{ text: message.text, message }] });
    }
}
const sleep = (ms, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("aborted"));
    });
});
/** read_file, write_file (a write: needs approval), wait (slow, for order checks), boom (throws). */
export function repoTools(log) {
    return [
        defineTool({
            name: "read_file",
            description: "Read a file",
            input: z.object({ path: z.string() }),
            output: z.string(),
            run: ({ path }) => {
                log(`read ${path}`);
                return Promise.resolve(`contents of ${path}`);
            },
        }),
        defineTool({
            name: "write_file",
            description: "Write a file",
            channel: "terminal",
            input: z.object({ path: z.string(), content: z.string() }),
            output: z.string(),
            run: ({ path, content }) => {
                log(`write ${path}=${content}`);
                return Promise.resolve(`wrote ${path}`);
            },
        }),
        defineTool({
            name: "wait",
            description: "Wait",
            input: z.object({ ms: z.number() }),
            output: z.string(),
            run: async ({ ms }, ctx) => {
                await sleep(ms, ctx.signal);
                log(`waited ${String(ms)}`);
                return `waited ${String(ms)}`;
            },
        }),
        defineTool({
            name: "boom",
            description: "Always fails",
            input: z.object({}),
            output: z.string(),
            run: () => Promise.reject(new Error("disk on fire")),
        }),
    ];
}
