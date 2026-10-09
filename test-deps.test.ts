import { createAppDeps } from "./packages/graphcompose/src/app/app-deps.js";
import { vi } from "vitest";
import * as modelsModule from "./packages/graphcompose/src/app/models.js";

vi.spyOn(modelsModule, "modelsFor").mockResolvedValue({ summary: {}, resolve: vi.fn(), gateway: {} } as any);

const deps = await createAppDeps({} as any, {} as any, {} as any, {} as any, {} as any);
console.log(deps.piiPolicies("agent"));
