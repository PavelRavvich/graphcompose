import { ModelFailure } from "./model-failure.js";
/** How the wait between attempts grows. */
export var Backoff;
(function (Backoff) {
  Backoff["Exponential"] = "exponential";
  Backoff["Fixed"] = "fixed";
  Backoff["None"] = "none";
})(Backoff || (Backoff = {}));
export class RetryPolicyError extends RangeError {
  name = "RetryPolicyError";
}
const checkAttempts = (maxAttempts) => {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RetryPolicyError(`maxAttempts must be an integer ≥ 1, got ${String(maxAttempts)}`);
  }
};
export const RetryPolicy = {
  exponential(options) {
    checkAttempts(options.maxAttempts);
    if (options.maxDelay < options.initialDelay) {
      throw new RetryPolicyError("maxDelay must not be shorter than initialDelay");
    }
    return Object.freeze({ backoff: Backoff.Exponential, ...options });
  },
  fixed(options) {
    checkAttempts(options.maxAttempts);
    return Object.freeze({ backoff: Backoff.Fixed, ...options });
  },
  none() {
    return Object.freeze({ backoff: Backoff.None });
  },
};
/** Whether a failure after `attempt` attempts (1 = the first) is tried again. */
export function isRetried(policy, failure, attempt) {
  if (policy.backoff === Backoff.None) return false;
  return attempt < policy.maxAttempts && policy.retryOn.includes(failure);
}
/** The longest wait the policy allows: a longer `Retry-After` ends the retries. */
export function longestWaitOf(policy) {
  switch (policy.backoff) {
    case Backoff.Exponential:
      return policy.maxDelay;
    case Backoff.Fixed:
      return policy.delay;
    case Backoff.None:
      return 0;
  }
}
/** The wait before retry number `retry` (1 = the first retry); `random` ∈ [0, 1) for the jitter. */
export function delayBefore(policy, retry, random) {
  switch (policy.backoff) {
    case Backoff.Exponential: {
      const grown = Math.min(policy.maxDelay, policy.initialDelay * 2 ** (retry - 1));
      return policy.jitter ? grown / 2 + (grown / 2) * random() : grown;
    }
    case Backoff.Fixed:
      return policy.delay;
    case Backoff.None:
      return 0;
  }
}
/** Timeouts, rate limits and server errors: what a provider usually retries. */
export const TRANSIENT_FAILURES = [
  ModelFailure.Timeout,
  ModelFailure.RateLimited,
  ModelFailure.ServerError,
];
