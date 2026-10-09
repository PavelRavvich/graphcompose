/** A failure the toolkit raises for a test: it carries a stable code. */
export class TestFailure extends Error {
  name = "TestFailure";
  code;
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}
/** A model, an MCP server or a network host a test would reach — stopped before the call. */
export class LiveCallBlockedError extends TestFailure {
  name = "LiveCallBlockedError";
  constructor(message) {
    super("test.live-call-blocked", message);
  }
}
/** The test itself is set up wrong: `mockOf` / `mcpOf` of something the workflow does not use. */
export class TestSetupError extends Error {
  name = "TestSetupError";
}
/** Anything thrown, as an Error. */
export const asError = (thrown) => (thrown instanceof Error ? thrown : new Error(String(thrown)));
