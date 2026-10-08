export class JevApiError extends Error {
    name = "JevApiError";
}
export function jevDecisionsUrl(baseUrl) {
    return `${baseUrl.replace(/\/v1\/?$/, "")}/alpha/decisions`;
}
/** OpenRouter Decisions API (alpha): POST {base}/alpha/decisions. */
/** A Jev decision that gets no replyWith in time is a router failure (routing falls back as usual). */
export const JEV_TIMEOUT_MS = 30_000;
export function createJevClient(connection, fetchImpl = fetch, timeoutMs = JEV_TIMEOUT_MS) {
    const url = jevDecisionsUrl(connection.baseUrl);
    return async (request) => {
        const response = await fetchImpl(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${connection.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
            throw new JevApiError(`Jev API ${String(response.status)}: ${await response.text()}`);
        }
        const body = await response.json();
        return body;
    };
}
