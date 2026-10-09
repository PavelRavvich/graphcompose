/** Why a model call failed — what a retry policy may retry on. */
export var ModelFailure;
(function (ModelFailure) {
  ModelFailure["Timeout"] = "timeout";
  ModelFailure["RateLimited"] = "rate-limited";
  ModelFailure["ServerError"] = "server-error";
  ModelFailure["NetworkError"] = "network-error";
})(ModelFailure || (ModelFailure = {}));
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_SERVER_ERROR = 500;
/** The failure an HTTP status means; `undefined` for a success or a client error (not retried). */
export function failureOfStatus(status) {
  if (status === HTTP_TOO_MANY_REQUESTS) return ModelFailure.RateLimited;
  if (status === HTTP_REQUEST_TIMEOUT) return ModelFailure.Timeout;
  if (status >= HTTP_SERVER_ERROR) return ModelFailure.ServerError;
  return undefined;
}
/** The failure a thrown fetch error means: a timeout, or the network. */
export const failureOfError = (error) =>
  error instanceof Error && error.name === "TimeoutError"
    ? ModelFailure.Timeout
    : ModelFailure.NetworkError;
/** `Retry-After` in milliseconds (seconds or an HTTP date); `undefined` when absent or unreadable. */
export function retryAfterOf(response, now) {
  const header = response.headers.get("retry-after");
  if (header === null || header.trim() === "") return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}
