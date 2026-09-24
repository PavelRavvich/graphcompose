import { z } from "zod";

/** External input is validated here; inside the system types are trusted. */
export const RunInputSchema = z.object({
  task: z.string().trim().min(1, "task must not be empty"),
});

export type RunInput = z.infer<typeof RunInputSchema>;
