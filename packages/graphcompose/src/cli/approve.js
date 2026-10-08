import { userInfo } from "node:os";
const idle = (work) => work(undefined);
/** The terminal's decision on a call: `by` is the OS user who answered. */
export function terminalDecision(approved) {
    const by = userInfo().username;
    return approved ? { approved, by } : { approved, by, feedback: "declined in the terminal" };
}
/** A paused run asks in the terminal, then continues in the same process. */
export async function untilDone(first, app, ask, busy = idle) {
    let result = first;
    while (result.pause !== undefined) {
        const { agent, tool, args } = result.pause;
        const reply = await ask(`${agent} wants to call ${tool} ${JSON.stringify(args)} — approve? [y/N] `);
        const approved = /^y(es)?$/i.test((reply ?? "").trim());
        const { thread } = result;
        const decision = terminalDecision(approved);
        result = await busy((signal) => app.resume(thread, decision, { signal }));
    }
    return result;
}
/** First line under an replyWith: which conversation, and its trace when tracing is on. */
export function threadLine(result) {
    return result.traceUrl === undefined
        ? `thread ${result.thread}`
        : `thread ${result.thread} · ${result.traceUrl}`;
}
/** `memory: turns 1–5 → summary 1/10` when this turn compacted the conversation. */
export function memoryLine(result) {
    const c = result.compacted;
    if (c === undefined)
        return undefined;
    return `memory: turns ${String(c.fromTurn)}–${String(c.toTurn)} → summary ${String(c.summaries)}/${String(c.keep)}`;
}
/** One line under an replyWith: route and why the run stopped. */
export function summaryLine(result) {
    const route = result.route.length > 0 ? result.route.join(" → ") : "(none)";
    return `${route} · stop: ${result.stopReason}`;
}
