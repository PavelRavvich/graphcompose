import { CallbackHandler } from "@langfuse/langchain";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { setLangfuseTracerProvider } from "@langfuse/tracing";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import type { RunTracing } from "./types.js";

/**
 * Tracing into a (self-hosted) Langfuse when LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and
 * LANGFUSE_BASE_URL are set; undefined otherwise. Uses an isolated tracer provider — the core does
 * not register global OpenTelemetry. Session = conversation thread, tags = bundle.
 */
export function langfuseTracing(env: NodeJS.ProcessEnv): RunTracing | undefined {
  const publicKey = env.LANGFUSE_PUBLIC_KEY;
  const secretKey = env.LANGFUSE_SECRET_KEY;
  const baseUrl = env.LANGFUSE_BASE_URL;
  if (!publicKey || !secretKey || !baseUrl) return undefined;
  const processor = new LangfuseSpanProcessor({ publicKey, secretKey, baseUrl });
  const provider = new BasicTracerProvider({ spanProcessors: [processor] });
  setLangfuseTracerProvider(provider);
  return {
    callbacks: ({ bundle, threadId, runId }) => [
      new CallbackHandler({
        sessionId: threadId,
        tags: [bundle],
        traceMetadata: { bundle, runId },
      }),
    ],
    shutdown: async () => {
      await provider.shutdown();
      setLangfuseTracerProvider(null);
    },
  };
}
