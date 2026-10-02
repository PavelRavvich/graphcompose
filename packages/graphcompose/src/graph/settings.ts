import { z } from "zod";
import type { Usd } from "../units/index.js";
import type { ModelProviderType } from "../models/model-provider.decorator.js";

/** Limits of one run: steps (agent and router visits) and spend. */
export interface PerRunLimits {
  /** Default: (agents + routers) × 3. */
  readonly steps?: number;
  readonly cost?: Usd;
}

/** Limits of one workflow per UTC day. */
export interface PerDayLimits {
  readonly cost?: Usd;
}

/** `.limits({ perRun: { steps: 30, cost: usd(0.5) }, perDay: { cost: usd(5) } })`. */
export interface WorkflowLimits {
  readonly perRun?: PerRunLimits;
  readonly perDay?: PerDayLimits;
}

const WorkflowLimitsSchema = z.object({
  perRun: z
    .object({ steps: z.number().int().positive().optional(), cost: z.number().min(0).optional() })
    .optional(),
  perDay: z.object({ cost: z.number().min(0).optional() }).optional(),
});

export class WorkflowSettingsError extends Error {
  override name = "WorkflowSettingsError";
}

/** The model providers of a workflow; none registered = OpenRouter and Jev (`graphcompose/models`). */
export interface ModelProviderSettings {
  readonly modelProviders?: readonly ModelProviderType[];
  /** Serves a model several registered providers serve. */
  readonly defaultModelProvider?: ModelProviderType;
}

/** Builds `WorkflowSettings`; each method sets one part, `build()` checks and freezes them. */
export interface WorkflowSettingsBuilder {
  readonly limits: (limits: WorkflowLimits) => WorkflowSettingsBuilder;
  /** `@ModelProvider` classes; each model must be served by exactly one (or the default). */
  readonly modelProviders: (providers: readonly ModelProviderType[]) => WorkflowSettingsBuilder;
  readonly defaultModelProvider: (provider: ModelProviderType) => WorkflowSettingsBuilder;
  readonly build: () => WorkflowSettings;
}

/** A workflow's settings, returned by its `settings()`. Other parts arrive with their issues. */
export class WorkflowSettings {
  private constructor(
    readonly limits: WorkflowLimits,
    readonly models: ModelProviderSettings,
  ) {}

  static builder(): WorkflowSettingsBuilder {
    let limits: WorkflowLimits = {};
    let models: ModelProviderSettings = {};
    const builder: WorkflowSettingsBuilder = {
      limits: (value) => {
        const parsed = WorkflowLimitsSchema.safeParse(value);
        if (!parsed.success) {
          throw new WorkflowSettingsError(`limits: ${z.prettifyError(parsed.error)}`);
        }
        limits = value;
        return builder;
      },
      modelProviders: (providers) => {
        if (providers.length === 0) {
          throw new WorkflowSettingsError("modelProviders: register at least one provider");
        }
        models = { ...models, modelProviders: [...providers] };
        return builder;
      },
      defaultModelProvider: (provider) => {
        models = { ...models, defaultModelProvider: provider };
        return builder;
      },
      build: () => new WorkflowSettings(Object.freeze({ ...limits }), Object.freeze({ ...models })),
    };
    return builder;
  }
}

/** What a `@Workflow` class implements: `settings()` is required. */
export interface WorkflowDefinition {
  settings(): WorkflowSettings;
}
