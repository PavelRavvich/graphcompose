export class ModelCallError extends Error {
  code;
  provider;
  name = "ModelCallError";
  constructor(code, provider, message) {
    super(`${code}: ${message}`);
    this.code = code;
    this.provider = provider;
  }
}
/** One provider's breaker: counts failed calls in a sliding window, opens, closes after `openFor`. */
export class CircuitBreaker {
  policy;
  now;
  failures = [];
  openedAt;
  constructor(policy, now = Date.now) {
    this.policy = policy;
    this.now = now;
  }
  /** Open: calls must not reach the provider. Closes by itself once `openFor` has passed. */
  isOpen() {
    if (this.openedAt === undefined) return false;
    if (this.now() - this.openedAt < this.policy.openFor) return true;
    this.openedAt = undefined;
    this.failures = [];
    return false;
  }
  recordFailure() {
    const now = this.now();
    this.failures = [...this.failures.filter((at) => now - at < this.policy.window), now];
    if (this.failures.length >= this.policy.failureThreshold) this.openedAt = now;
  }
  recordSuccess() {
    this.failures = [];
  }
}
/** Breakers shared per provider name — one per process until #121 shares them across processes. */
export class CircuitBreakers {
  now;
  byProvider = new Map();
  constructor(now = Date.now) {
    this.now = now;
  }
  of(provider, policy) {
    const breaker = this.byProvider.get(provider) ?? new CircuitBreaker(policy, this.now);
    this.byProvider.set(provider, breaker);
    return breaker;
  }
}
/** The process's breakers: every app in the process shares a provider's breaker. */
export const processCircuitBreakers = new CircuitBreakers();
