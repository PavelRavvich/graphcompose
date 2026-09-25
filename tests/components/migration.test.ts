import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bundles } from "../../src/bundles.js";
import { bundleOf, componentOf } from "../../src/components/index.js";

describe("components — one style everywhere", () => {
  it("AC5: every bundle is a @Bundle class; the previous config-based wiring is gone", async () => {
    for (const [name, bundleClass] of Object.entries(bundles)) {
      expect(componentOf(bundleClass)?.kind, name).toBe("bundle");
      expect((await bundleOf(bundleClass)).config.version).toBe("1.1.0");
    }
    for (const gone of [
      "src/config/agents.config.ts",
      "src/tools/catalog.ts",
      "src/tools/registry.ts",
      "src/demos/company-assistant/config.ts",
      "src/demos/job-scout/config.ts",
    ]) {
      expect(existsSync(gone), gone).toBe(false);
    }
  });

  it("AC4: describe shows each tool's constructor dependencies", async () => {
    const { toolDependencies } = await bundleOf(bundles["job-scout"] ?? Object);

    expect(toolDependencies).toEqual({
      greenhouse_jobs: "JobFitJudge (ROUTER_FACTORY), JOB_SEARCH",
    });
  });
});
