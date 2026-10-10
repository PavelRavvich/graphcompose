import type { A2AEvent, A2AExecutionRequest } from "./types.js";

export interface A2AClientOptions {
  readonly endpoint: string;
  readonly headers?: Record<string, string>;
  /** Pluggable fetch implementation (SOLID: Dependency Inversion) */
  readonly fetcher?: typeof fetch;
}

export interface IA2AClient {
  execute<TOutput>(
    input: unknown,
    onEvent?: (event: A2AEvent) => void,
    signal?: AbortSignal,
  ): Promise<TOutput>;
}

/**
 * Outbound client to execute workflows on remote A2A instances.
 * Propagates cancellations via AbortSignal.
 */
export class A2AClient implements IA2AClient {
  private readonly endpoint: string;

  private readonly fetcher: typeof fetch;

  constructor(options?: A2AClientOptions) {
    if (options) {
      this.endpoint = options.endpoint;
      this.fetcher = options.fetcher ?? fetch;
    } else {
      // Will be injected by assemble.ts via metadata
      this.endpoint = "";
      this.fetcher = fetch;
    }
  }

  protected async getHeaders(): Promise<Record<string, string>> {
    return {};
  }

  public async execute<TOutput>(
    input: unknown,
    onEvent?: (event: A2AEvent) => void,
    signal?: AbortSignal,
  ): Promise<TOutput> {
    const reqBody: A2AExecutionRequest = { input };

    // 1. Post to the external endpoint
    const response = await this.fetcher(`${this.endpoint}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await this.getHeaders()),
      },
      body: JSON.stringify(reqBody),
      signal,
    });

    if (!response.ok) {
      throw new Error(`A2A Request failed with status ${String(response.status)}`);
    }

    // 2. We can either read SSE stream from response, or expect a JSON if synchronous.
    // Assuming a synchronous JSON response for this basic interface, or SSE stream handling.
    // For SOLID adherence, the streaming chunk parser should ideally be injected, but
    // we can parse ndjson or standard events here.

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream") && response.body) {
      return this.consumeStream<TOutput>(
        response.body,
        onEvent ??
          (() => {
            /* no-op */
          }),
      );
    }

    // If not streaming, wait for standard response
    const json = (await response.json()) as { result: TOutput };
    return json.result;
  }

  private async consumeStream<TOutput>(
    body: ReadableStream<Uint8Array>,
    onEvent: (event: A2AEvent) => void = () => {
      /* no-op */
    },
  ): Promise<TOutput> {
    // Stream reading logic (simplified)
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let result: TOutput | undefined;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Assume ndjson or SSE parsing logic would map to A2AEvent here
        // Simplified event trigger:
        const event = { type: "progress", payload: { step: "remote", content: chunk } } as A2AEvent;

        onEvent(event);

        // If finish event is parsed, set result = payload.result (implementation omitted for brevity)
      }
      if (result === undefined) {
        throw new Error("Stream closed without finish event");
      }
      return result;
    } finally {
      reader.releaseLock();
    }
  }
}
