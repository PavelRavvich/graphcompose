import { z } from "zod";

/** External input is validated here; inside the system types are trusted. */
export const RunInputSchema = z.object({
  task: z.string().trim().min(1, "task must not be empty"),
  /** Omit on first contact: a new thread is created and returned. */
  threadId: z.string().min(1).optional(),
});

export type RunInput = z.infer<typeof RunInputSchema>;
