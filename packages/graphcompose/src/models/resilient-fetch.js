import { ModelCallError } from "./circuit-breaker.js";
import { failureOfError, failureOfStatus, retryAfterOf } from "./model-failure.js";
import { delayBefore, isRetried, longestWaitOf } from "./retry-policy.js";
const realSleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const urlOf = (input) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
/** The same request to the fallback: its base URL in place of the provider's, its key. */
function toFallback(input, init, options, fallback) {
  const url = urlOf(input).replace(options.baseUrl, fallback.baseUrl);
  const headers = new Headers(init?.headers);
  if (fallback.apiKey === undefined) headers.delete("authorization");
  else headers.set("authorization", `Bearer ${fallback.apiKey}`);
  return fallback.fetch(url, { ...init, headers });
}
/** One attempt under the provider's timeout (and the caller's own signal). */
async function attemptOnce(send, input, init, timeout) {
  const signals = [AbortSignal.timeout(timeout), ...(init?.signal ? [init.signal] : [])];
  try {
    const response = await send(input, { ...init, signal: AbortSignal.any(signals) });
    const failure = failureOfStatus(response.status);
    return failure === undefined
      ? { kind: "answered", response }
      : { kind: "answered", response, failure };
  } catch (error) {
    if (init?.signal?.aborted === true) throw error;
    return { kind: "threw", error, failure: failureOfError(error) };
  }
}
/** How long to wait before the next attempt; `undefined` = stop (not retried, or Retry-After too long). */
function waitBefore(attempt, tries, options) {
  const failure = attempt.failure;
  if (failure === undefined || !isRetried(options.retryPolicy, failure, tries)) return undefined;
  const planned = delayBefore(options.retryPolicy, tries, options.random ?? Math.random);
  if (attempt.kind === "threw") return planned;
  const retryAfter = retryAfterOf(attempt.response, (options.now ?? Date.now)());
  if (retryAfter === undefined) return planned;
  return retryAfter > longestWaitOf(options.retryPolicy)
    ? undefined
    : Math.max(planned, retryAfter);
}
/**
 * A provider's client: each call is tried under the retry policy (only the listed failures,
 * `Retry-After` honoured) as one call — retries are not separate attempts and are not paid twice;
 * the breaker counts failed calls and, open, sends calls to the fallback or fails fast.
 */
export function resilientFetch(options, send) {
  const sleep = options.sleep ?? realSleep;
  return async (input, init) => {
    if (options.breaker.isOpen()) {
      if (options.fallback !== undefined) return toFallback(input, init, options, options.fallback);
      throw new ModelCallError(
        "model.circuit-open",
        options.provider,
        `${options.provider} is failing; calls are paused`,
      );
    }
    for (let tries = 1; ; tries++) {
      const attempt = await attemptOnce(send, input, init, options.timeout);
      if (attempt.kind === "answered" && attempt.failure === undefined) {
        options.breaker.recordSuccess();
        return attempt.response;
      }
      const wait = waitBefore(attempt, tries, options);
      if (wait === undefined) {
        options.breaker.recordFailure();
        if (attempt.kind === "threw") throw attempt.error;
        return attempt.response;
      }
      if (attempt.kind === "answered") await attempt.response.body?.cancel();
      await sleep(wait);
    }
  };
}
