import { isSelf, isReturn, isEnd } from "../graph/flow.js";
import { SELF_OPTION } from "../graph/route.js";
import { routerCaller } from "../routers/index.js";
import { asError, TestFailure } from "./errors.js";
import { nodeNameOf } from "./failure-facts.js";
import { replyWith } from "./script.js";
import { ScriptedChatModel } from "./scripted-chat-model.js";
/** The script key of a chat model's user and of a router. */
export const chatKeyOf = (user) => user.kind === "compaction"
    ? "compaction"
    : `${user.kind}:${user.kind === "agent" ? user.agent : user.router}`;
export const routerKeyOf = (router) => `router:${router}`;
/** The option a router sees for a target: its node name, or `self`. */
export const optionOf = (target) => isSelf(target)
    ? SELF_OPTION
    : isReturn(target)
        ? "Return"
        : isEnd(target)
            ? "End"
            : target.kind === "parallel" || target.kind === "optional"
                ? target.kind
                : nodeNameOf(target);
const failed = (reason) => ({ kind: "failed", reason });
/** Guards nobody scripted pass: content checks are not what most tests are about. */
const GUARD_PASSES = {
    kind: "decided",
    decision: { next: "pass", reason: "unscripted guard", confidence: 1 },
};
/** Conversation compaction nobody scripted writes this summary. */
export const UNSCRIPTED_SUMMARY = "(summary of the earlier turns)";
function usageOf(spec, details) {
    if (details.cost === undefined)
        return undefined;
    const model = spec.model.kind === "jev" ? spec.model.model : spec.model.settings.model;
    return {
        caller: routerCaller(spec.router),
        model,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        costUsd: details.cost,
        costSource: "api",
    };
}
/** A scripted turn as the router's outcome; a target outside its routes fails the test. */
function outcomeOf(turn, spec, script) {
    if (turn.kind === "failure")
        return failed(`scripted model failure: ${turn.failure}`);
    if (turn.kind !== "decision") {
        throw new TestFailure("test.wrong-script", `${script.label} is a router: script it with routeTo(…), not replyWith(…) / callTool(…)`);
    }
    const next = optionOf(turn.target);
    const options = spec.request.options.map((option) => option.name);
    if (!options.includes(next)) {
        throw new TestFailure("test.not-a-route", `routeTo(${next}) for ${script.label}: not one of its routes (${options.join(", ")})`);
    }
    const decision = {
        next,
        reason: turn.details.reason ?? "scripted",
        confidence: turn.details.confidence ?? 1,
    };
    const usage = usageOf(spec, turn.details);
    return usage === undefined ? { kind: "decided", decision } : { kind: "decided", decision, usage };
}
/**
 * The model gateway of a test: every chat model and every decision answers by script. A failure
 * that must fail the test (no script, script exhausted, not a route) is reported to the book and
 * returned as a failed outcome — the run fails, the test sees the reported failure.
 */
export function createScriptedGateway(book) {
    const compaction = book.scriptOf("compaction");
    if (!compaction.isScripted)
        compaction.thenReturnAlways(replyWith(UNSCRIPTED_SUMMARY));
    return {
        chatModel: ({ user, settings }) => new ScriptedChatModel(book, chatKeyOf(user), settings),
        routeTo: (spec) => {
            const script = book.scriptOf(routerKeyOf(spec.router));
            const req = {
                kind: "decision",
                input: spec.request.input,
                options: spec.request.options.map((option) => option.name),
                instructions: spec.request.instructions ?? "",
            };
            script.requests.push(req);
            if (!script.isScripted && spec.router.startsWith("guard:")) {
                return Promise.resolve(GUARD_PASSES);
            }
            try {
                return Promise.resolve(outcomeOf(script.next(req), spec, script));
            }
            catch (error) {
                return Promise.resolve(failed(book.report(asError(error)).message));
            }
        },
    };
}
