import { LiveCallBlockedError, TestFailure } from "./errors.js";
const plural = (count, word) => `${String(count)} ${word}${count === 1 ? "" : "s"}`;
/** One component's script: turns by position (its model calls so far in this test), requests. */
export class ComponentScript {
    label;
    requests = [];
    toolCalls = [];
    #turns = [];
    #always;
    #handler;
    #position = 0;
    constructor(label) {
        this.label = label;
    }
    thenReturn(...turns) {
        this.#turns.push(...turns);
        return this;
    }
    thenAnswer(handler) {
        this.#handler = handler;
        return this;
    }
    thenReturnAlways(turn) {
        this.#always = turn;
        return this;
    }
    get isScripted() {
        return this.#handler !== undefined || this.#turns.length > 0 || this.#always !== undefined;
    }
    /** The turn for the next call; unscripted → blocked, past the end → exhausted. */
    next(req) {
        if (this.#handler !== undefined) {
            if (!req)
                throw new Error("ModelRequest is required when using .thenAnswer()");
            return this.#handler(req);
        }
        if (!this.isScripted) {
            throw new LiveCallBlockedError(`${this.label} has no script — a live model call is blocked in tests; script it with mockLlm(${this.label}).thenReturn(…)`);
        }
        const turn = this.#turns[this.#position] ?? this.#always;
        this.#position += 1;
        if (turn === undefined) {
            throw new TestFailure("test.script-exhausted", `script exhausted for ${this.label}: ${plural(this.#turns.length, "turn")} scripted, asked for #${String(this.#position)} — add turns or end with .thenReturnAlways(…)`);
        }
        return turn;
    }
    get onlyRequest() {
        const [only, ...rest] = this.requests;
        if (only === undefined || rest.length > 0) {
            throw new TestFailure("test.wrong-script", `mockLlm(${this.label}).onlyRequest: expected exactly one request, got ${String(this.requests.length)}`);
        }
        return only;
    }
    get lastRequest() {
        const last = this.requests.at(-1);
        if (last === undefined) {
            throw new TestFailure("test.wrong-script", `mockLlm(${this.label}): no request was sent`);
        }
        return last;
    }
}
/**
 * Every component's script in one test, shared by every app the test opens — so a run resumed in a
 * new app continues the same script. Failures that must fail the test are kept until reported.
 */
export class ScriptBook {
    #scripts = new Map();
    #labels = new Map();
    #failures = [];
    #toolCallIds = 0;
    /** How the test names the component behind a key (its class), for messages. */
    name(key, label) {
        this.#labels.set(key, label);
    }
    scriptOf(key) {
        const existing = this.#scripts.get(key);
        if (existing !== undefined)
            return existing;
        const created = new ComponentScript(this.#labels.get(key) ?? key);
        this.#scripts.set(key, created);
        return created;
    }
    /** A tool call id unique within the test (results are keyed by it). */
    nextToolCallId() {
        this.#toolCallIds += 1;
        return `call-${String(this.#toolCallIds)}`;
    }
    /** Remembers a failure the test must see, even if a run swallowed it (a tool error, a guard). */
    report(failure) {
        this.#failures.push(failure);
        return failure;
    }
    /** The first failure reported since the last call, if any (then forgotten). */
    takeFailure() {
        const [first] = this.#failures;
        this.#failures.length = 0;
        return first;
    }
}
