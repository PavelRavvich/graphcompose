import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { ExecutionOutput } from "../../src/app/types.js";
import { TestEnvironment } from "../../src/testing/environment.js";
import {
  callTool,
  CassetteMissingError,
  replyWith,
  routeTo,
  testWith,
  VCRMode,
} from "../../src/testing/index.js";
import { cassetteFileOf, vcrModeOf } from "../../src/testing/vcr.js";
import {
  ChatStart,
  Desk,
  MainRouter,
  OrderStatus,
  Reply,
  Support,
} from "./fixtures/desk.workflow.js";
import { recordDesk } from "./fixtures/vcr-recording.js";

const dir = mkdtempSync(join(tmpdir(), "vcr-"));
const cassette = { cassetteName: "desk-order", dir };
const file = cassetteFileOf(cassette);
const replay = testWith(Desk, { vcr: { ...cassette, mode: VCRMode.REPLAY } });
let recorded: ExecutionOutput;

beforeAll(async () => {
  recorded = await recordDesk(file, "Where is order 42?", (book) => {
    book.scriptOf("router:main").thenReturn(routeTo(Support), routeTo(Reply));
    book
      .scriptOf("agent:support")
      .thenReturn(callTool(OrderStatus, { orderId: "42" }), replyWith("Shipped."));
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AC1 (#204): VCR — record once, replay in CI without a model", () => {
  it("the cassette holds every model call: Jev decisions, guards and agent turns, by key", () => {
    const { interactions } = JSON.parse(readFileSync(file, "utf8")) as {
      interactions: { kind: string; key: string }[];
    };

    expect(interactions.map(({ kind, key }) => `${kind} ${key}`)).toEqual([
      "decision router:guard:prompt_injection",
      "decision router:main",
      "chat agent:support",
      "chat agent:support",
      "decision router:main",
    ]);
  });

  replay(
    "replays the recorded run with no script, no key and the network blocked",
    async ({ app }) => {
      const before = readFileSync(file, "utf8");

      const result = await app.execute(ChatStart, { text: "Where is order 42?" });

      expect(result).toFollowPath([ChatStart, MainRouter, Support, MainRouter, Reply]);
      expect(result).toFinishWith(Reply, { text: "Shipped." });
      expect(result.output).toEqual(recorded.output);
      expect(readFileSync(file, "utf8")).toBe(before);
    },
  );

  replay("a request the cassette does not hold fails loudly, naming the call", async ({ app }) => {
    const run = app.execute(ChatStart, { text: "Where is order 7?" });

    await expect(run).rejects.toBeInstanceOf(CassetteMissingError);
    await expect(run).rejects.toMatchObject({
      code: "test.cassette-missing",
      message: expect.stringContaining(
        "has no recording of this router:guard:prompt_injection request",
      ),
    });
  });

  it("under CI a missing cassette fails before the test runs, and nothing is recorded", async () => {
    vi.stubEnv("CI", "true");
    const missing = { cassetteName: "never-recorded", dir };

    await expect(TestEnvironment.of(Desk, { vcr: missing })).rejects.toMatchObject({
      name: "CassetteMissingError",
      code: "test.cassette-missing",
    });
    expect(existsSync(cassetteFileOf(missing))).toBe(false);
  });

  it("the mode: as given; REPLAY under CI; else AUTO", () => {
    const named = { cassetteName: "x" };

    expect(vcrModeOf(named, { CI: "true" })).toBe(VCRMode.REPLAY);
    expect(vcrModeOf(named, { CI: "1" })).toBe(VCRMode.REPLAY);
    expect(vcrModeOf(named, { CI: "false" })).toBe(VCRMode.AUTO);
    expect(vcrModeOf(named, {})).toBe(VCRMode.AUTO);
    expect(vcrModeOf({ ...named, mode: VCRMode.RECORD }, { CI: "true" })).toBe(VCRMode.RECORD);
  });
});
