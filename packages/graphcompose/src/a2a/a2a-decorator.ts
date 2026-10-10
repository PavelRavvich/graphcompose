import { recordComponent } from "../components/metadata.js";
import type { A2AClient } from "./a2a-client.js";

import type { Token } from "../components/injection.js";

export interface A2AAgentConfig<D extends readonly Token[] = []> {
  readonly name: string;
  readonly endpoint: string;
  readonly deps?: D;
}

/**
 * Decorator to register an external A2A Agent as a client.
 * Works similarly to `@McpServer`.
 */
export function A2AAgent<const D extends readonly Token[] = []>(config: A2AAgentConfig<D>) {
  return <C extends new (...args: unknown[]) => A2AClient>(value: C): C => {
    // Record it so the container or assembler can initialize it
    recordComponent(value, { kind: "a2a-agent", meta: { config } });
    return value;
  };
}
