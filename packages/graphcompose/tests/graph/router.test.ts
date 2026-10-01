import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ComponentError } from "../../src/components/metadata.js";
import { assembleFlowGraph } from "../../src/graph/build.js";
import { from, Self, type Flow } from "../../src/graph/flow.js";
import { RouterDecisionError } from "../../src/graph/nodes/flow-router.js";
import { route } from "../../src/graph/route.js";
import { Router } from "../../src/graph/router.decorator.js";
import { flowRouterFactory, routerModelOf } from "../../src/graph/router-model.js";
import type { Router as RoutingStrategy } from "../../src/routers/index.js";
import { fakeChatFactory, unusedJevClient, usageRecord } from "../helpers.js";
import { codeReviewFlow } from "./fixtures/code-review.js";
import { scriptedRouter, testRuntime } from "./fixtures/nodes.js";
import { A, B, Done, Gate, Only, Pick, Start } from "./fixtures/rule-nodes.js";

const dir = mkdtempSync(join(tmpdir(), "router-texts-"));
const promptFile = join(dir, "how.prompt.md");
const routeFile = join(dir, "done.route.md");
writeFileSync(promptFile, "﻿\r\n\r\nLook at the review.\r\n  Keep indentation.\r\n\r\n");
writeFileSync(routeFile, "﻿The work is finished.\r\n");

@Router({
  name: "texts",
  description: "Texts from files",
  prompt: "Decide carefully.",
  promptUrls: [promptFile],
  model: "typesafe/jev-1.13",
  routes: [route(Done, { prompt: "Done:", promptUrls: [routeFile] }), route(A, "Café work")],
})
class Texts {}

@Router({
  name: "lost",
  description: "Its prompt file is missing",
  promptUrls: ["./no-such.prompt.md"],
  model: "typesafe/jev-1.13",
  routes: [route(Done, "Finished")],
})
class Lost {}

const selfFlow: Flow = [
  from(Start).to(Pick),
  from(Pick).choose(A, B),
  from(A, B).to(Gate),
  from(Gate).choose(Self, Done),
];

async function run(flow: Flow, routers: Readonly<Record<string, RoutingStrategy>>) {
  const { graph } = await assembleFlowGraph(flow, testRuntime(routers));
  return graph.invoke({ task: "do it" });
}

const gate = scriptedRouter("gate", []);

const failingWith = (outcome: Awaited<ReturnType<RoutingStrategy["route"]>>): RoutingStrategy => ({
  name: "pick",
  route: () => Promise.resolve(outcome),
});

describe("AC1: routers", () => {
  it("sends routes sorted by target name with the router's prompt as instructions", async () => {
    const main = scriptedRouter("main", ["explainer"]);

    await run(codeReviewFlow, { main, "review-gate": scriptedRouter("review-gate", []) });

    expect(main.requests[0]?.options).toEqual([
      { name: "coder", description: "Writing code" },
      { name: "explainer", description: "Explaining code" },
    ]);
    expect(main.requests[0]?.instructions).toBe("Pick who handles the message.");
  });

  it("joins prompt then files with one blank line, normalised (BOM, CRLF, edges, NFC)", async () => {
    const texts = scriptedRouter("texts", ["done"]);

    await run([from(Start).to(Texts), from(Texts).choose(A, Done), from(A).to(Done)], { texts });

    expect(texts.requests[0]?.instructions).toBe(
      "Decide carefully.\n\nLook at the review.\n  Keep indentation.",
    );
    expect(texts.requests[0]?.options).toEqual([
      { name: "a", description: "Café work" },
      { name: "done", description: "Done:\n\nThe work is finished." },
    ]);
  });

  it("Self returns to the agent the router was called after", async () => {
    const state = await run(selfFlow, {
      pick: scriptedRouter("pick", ["b"]),
      gate: scriptedRouter("gate", ["self", "done"]),
    });

    expect(state.path).toEqual(["start", "pick", "b", "gate", "b", "gate", "done"]);
  });

  it("a returned option that is not a route fails the run with router.unknown-route", async () => {
    const error = await run(selfFlow, { pick: scriptedRouter("pick", ["ghost"]), gate }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(RouterDecisionError);
    expect(error).toMatchObject({ code: "router.unknown-route", router: "pick" });
  });

  it("an unknown option reported by the routing model is router.unknown-route, with its spend", async () => {
    const usage = usageRecord("router:pick", 0.01);
    const pick = failingWith({
      kind: "failed",
      reason: "unknown route: x",
      unknownOption: "x",
      usage,
    });

    await expect(run(selfFlow, { pick, gate })).rejects.toMatchObject({
      code: "router.unknown-route",
      usage: [usage],
    });
  });

  it("a failed decision call fails the run with router.failed and the model's reason", async () => {
    const pick = failingWith({ kind: "failed", reason: "router error: timeout" });

    await expect(run(selfFlow, { pick, gate })).rejects.toThrow(
      'Router "pick" [router.failed]: router error: timeout',
    );
  });

  it("a missing prompt file fails assembly", async () => {
    await expect(
      assembleFlowGraph([from(Start).to(Lost), from(Lost).choose(Done)], testRuntime({})),
    ).rejects.toBeInstanceOf(ComponentError);
  });
});

@Router({
  name: "chatty",
  description: "A chat model as a router",
  prompt: "Pick.",
  model: "test/router",
  routes: [route(A, "A"), route(Done, "Finished")],
})
class Chatty {}

describe("AC1: routers through the existing routing strategies", () => {
  const deps = {
    factories: {
      chatModel: fakeChatFactory({ "test/router": ['{"next":"done","reason":"ok"}'] }),
      jevClient: unusedJevClient,
    },
    chatDefaults: { temperature: 0, thinking: "default" as const, cache: false },
    chatModelSettings: (model: string) => ({
      model,
      price: { inputPerMTok: 1, outputPerMTok: 2 },
    }),
  };
  const runtime = testRuntime({}, { routerFor: flowRouterFactory(deps) });

  it("picks Jev for typesafe/jev-* and a chat model otherwise", () => {
    expect(routerModelOf("typesafe/jev-1.13", deps)).toEqual({
      kind: "jev",
      model: "typesafe/jev-1.13",
    });
    expect(routerModelOf("test/router", deps)).toMatchObject({ kind: "llm", model: "test/router" });
  });

  it("a router with one route decides without a model call", async () => {
    const flow: Flow = [from(Start).to(A), from(A).to(Only), from(Only).choose(Done)];
    const { graph } = await assembleFlowGraph(flow, runtime);

    const state = await graph.invoke({ task: "go" });

    expect(state.path).toEqual(["start", "a", "only", "done"]);
    expect(state.routeReason).toBe("single option");
  });

  it("a chat-model router decides from the model's JSON and records its usage", async () => {
    const flow: Flow = [from(Start).to(Chatty), from(Chatty).choose(A, Done), from(A).to(Done)];
    const { graph } = await assembleFlowGraph(flow, runtime);

    const state = await graph.invoke({ task: "go" });

    expect(state.path).toEqual(["start", "chatty", "done"]);
    expect(state.usage.map((record) => record.caller)).toEqual(["router:chatty"]);
  });
});
