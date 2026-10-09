import { processCircuitBreakers } from "./circuit-breaker.js";
import { settingValueIn } from "./environment-variable.js";
import { modelProviderOf } from "./model-provider.decorator.js";
import { resilientFetch } from "./resilient-fetch.js";
const keyOf = (options, connection) =>
  options.apiKey === undefined
    ? undefined
    : connection.requireKeys
      ? options.apiKey.requireIn(connection.env)
      : options.apiKey.valueIn(connection.env);
function connect(options, connection, fallback) {
  const baseUrl = settingValueIn(options.baseUrl, connection.env);
  const breakers = connection.breakers ?? processCircuitBreakers;
  return {
    provider: options.name,
    baseUrl,
    apiKey: keyOf(options, connection),
    fetch: resilientFetch(
      {
        provider: options.name,
        baseUrl,
        timeout: options.timeout,
        retryPolicy: options.retryPolicy,
        breaker: breakers.of(options.name, options.circuitBreakerPolicy),
        ...(fallback === undefined ? {} : { fallback }),
        ...(connection.sleep === undefined ? {} : { sleep: connection.sleep }),
      },
      connection.send ?? ((input, init) => fetch(input, init)),
    ),
  };
}
/**
 * A provider's connection: base URL and key from the environment, `fetch` with its timeout, retry
 * policy and circuit breaker; while the breaker is open, calls go to its fallback provider.
 */
export function connectionOf(options, connection) {
  const fallbackClass = options.circuitBreakerPolicy.fallback;
  const fallback =
    fallbackClass === undefined
      ? undefined
      : connect(modelProviderOf(fallbackClass), connection, undefined);
  return connect(options, connection, fallback);
}
