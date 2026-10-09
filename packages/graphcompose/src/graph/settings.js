import { z } from "zod";
const WorkflowLimitsSchema = z.object({
  perRun: z
    .object({ steps: z.number().int().positive().optional(), cost: z.number().min(0).optional() })
    .optional(),
  perDay: z.object({ cost: z.number().min(0).optional() }).optional(),
});
export class WorkflowSettingsError extends Error {
  name = "WorkflowSettingsError";
}
/** A workflow's settings, returned by its `settings()`. Other parts arrive with their issues. */
export class WorkflowSettings {
  limits;
  models;
  constructor(limits, models) {
    this.limits = limits;
    this.models = models;
  }
  static builder() {
    let limits = {};
    let models = {};
    const builder = {
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
