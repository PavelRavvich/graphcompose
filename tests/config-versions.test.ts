import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAppDeps } from "../src/app.js";
import { defaultBundle } from "../src/bundle.js";
import { runAgent } from "../src/index.js";
import { createSqliteTernStore } from "../src/terns/index.js";
import { decide, fakeDeps } from "./helpers.js";

describe("config versions", () => {
  it("AC2: every run is labelled with the declared version and the config hash", async () => {
    const deps = fakeDeps({
      "test/router": [decide("alpha"), decide("finish")],
      "test/alpha": ["ok"],
    });

    const result = await runAgent({ task: "Hi" }, deps);

    const [tern] = await deps.terns.byIds([result.ternId]);
    expect(tern?.configVersion).toBe("1.0.0");
    expect(tern?.configHash).toMatch(/^[0-9a-f]{12}$/);
  });

  it("AC2: the same version with other content is drift; snapshots are kept", async () => {
    const store = createSqliteTernStore(":memory:");

    expect(await store.rememberConfig("b", "1.0.0", "h1", "{a}")).toEqual({ drift: false });
    expect(await store.rememberConfig("b", "1.0.0", "h1", "{a}")).toEqual({ drift: false });
    expect(await store.rememberConfig("b", "1.0.0", "h2", "{b}")).toEqual({ drift: true });
    expect((await store.configSnapshots("b", "1.0.0")).map((s) => s.hash)).toEqual(["h1", "h2"]);
  });

  it("AC2: a config changed without a version bump warns on start", async () => {
    const env = {
      OPENROUTER_API_KEY: "k",
      TERN_DB: join(await mkdtemp(join(tmpdir(), "versions-")), "t.sqlite"),
    };
    const first = await createAppDeps(env, undefined, defaultBundle);
    await first.close();
    const changed = {
      ...defaultBundle,
      prompts: { ...defaultBundle.prompts, coder: "A different coder prompt." },
    };

    const second = await createAppDeps(env, undefined, changed);
    await second.close();

    expect(first.warnings).toEqual([]);
    expect(second.warnings[0]).toMatch(
      /config "research-coder" 1\.0\.0 changed without a version bump/,
    );
  });
});
