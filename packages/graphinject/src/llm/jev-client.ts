import type { OpenRouterConnection } from "./model.js";

/** Jev "choice" primitive: probability distribution over named criteria. */
export interface JevChoiceQuestion {
  readonly type: "choice";
  readonly instructions: string;
  readonly criteria: Readonly<Record<string, string>>;
}

export interface JevDecisionRequest {
  readonly model: string;
  /** Free text the decision is made about. */
  readonly state: string;
  readonly questions: Readonly<Record<string, JevChoiceQuestion>>;
}

/** Raw transport; the response is validated by the caller. */
export type JevClient = (request: JevDecisionRequest) => Promise<unknown>;

export class JevApiError extends Error {
  override name = "JevApiError";
}

export function jevDecisionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/v1\/?$/, "")}/alpha/decisions`;
}

/** OpenRouter Decisions API (alpha): POST {base}/alpha/decisions. */
export function createJevClient(
  connection: OpenRouterConnection,
  fetchImpl: typeof fetch = fetch,
): JevClient {
  const url = jevDecisionsUrl(connection.baseUrl);
  return async (request) => {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new JevApiError(`Jev API ${String(response.status)}: ${await response.text()}`);
    }
    const body: unknown = await response.json();
    return body;
  };
}
