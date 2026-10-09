/** A server needed by a facade cannot be reached, configured or authenticated. Stops startup. */
export class McpUnavailableError extends Error {
  name = "McpUnavailableError";
}
/** A server's contract differs from our facades. Stops startup. */
export class McpContractError extends Error {
  name = "McpContractError";
}
