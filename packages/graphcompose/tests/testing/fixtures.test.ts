import { describe, expect } from "vitest";
import { answer, callTool, decide, failWith, ModelFailure, TestSetupError, testWith } from "../../src/testing/index.js";
import {
  ChatStart,
  Desk,
  MainRouter,
  OrderBook,
  OrderStatus,
  Reply,
  Support,
  Writer,
} from "./fixtures/desk.workflow.js";
import { CodeReview, Unused } from "./fixtures/code-review.workflow.js";
import { toolResultsOf } from "./fixtures/requests.js";

const test = testWith(Desk);
const review = testWith(CodeReview);

describe("AC12: mockOf — a typed mock injected instead of the class", () => {
  test("the app's tool gets the mock; mockOf returns the same instance the app uses", async ({
    app,
    modelOf,
    mockOf,
  }) => {
    mockOf(OrderBook).statusOf.mockResolvedValue("order lost");
    modelOf(MainRouter).respond(decide(Support), decide(Reply));
    modelOf(Support).respond(callTool(OrderStatus, { orderId: "7" }), answer("Lost."));

    await app.execute(ChatStart, { text: "where is 7?" });

    expect(mockOf(OrderBook).statusOf.mock.calls).toEqual([["7"]]);
    expect(toolResultsOf(modelOf(Support).lastRequest)).toEqual(['{"status":"order lost"}']);
  });

  review("mockOf of a class the workflow does not use fails clearly", ({ mockOf }) => {
    expect(() => mockOf(Unused)).toThrow(TestSetupError);
    expect(() => mockOf(Unused)).toThrow("mockOf(Unused): not a component of this workflow");
  });

  test("mockOf after the app started fails clearly", async ({ app, mockOf }) => {
    await app.tool(OrderStatus).invoke({ orderId: "1" });

    expect(() => mockOf(OrderBook)).toThrow(/mockOf\(OrderBook\) after the app started/);
  });
});

describe("AC12: modelOf — what a component sent its model", () => {
  test("onlyRequest and lastRequest; toHaveBeenAskedWith matches parts", async ({
    app,
    modelOf,
  }) => {
    modelOf(MainRouter).respond(decide(Writer), decide(Reply));
    modelOf(Writer).respond(answer("Hello!"));

    await app.execute(ChatStart, { text: "say hello" });

    expect(modelOf(Writer).onlyRequest).toMatchObject({
      kind: "chat",
      system: expect.stringContaining("You write short replies.") as string,
    });
    expect(modelOf(Writer)).toHaveBeenAskedWith({ input: "say hello" });
    expect(modelOf(MainRouter).lastRequest).toMatchObject({
      kind: "decision",
      options: ["reply", "support", "writer"],
    });
    expect(modelOf(MainRouter)).toHaveBeenAskedWith({ instructions: "Pick who handles" });
  });

  test("onlyRequest fails unless there was exactly one; lastRequest fails with none", ({
    modelOf,
  }) => {
    expect(() => modelOf(Writer).onlyRequest).toThrow(
      "modelOf(Writer).onlyRequest: expected exactly one request, got 0",
    );
    expect(() => modelOf(Writer).lastRequest).toThrow("modelOf(Writer): no request was sent");
  });

  review(
    "modelOf of a class that is not an agent or router of the workflow fails",
    ({ modelOf }) => {
      expect(() => modelOf(Unused)).toThrow(
        "modelOf(Unused): not an agent or router of this workflow",
      );
      expect(() => modelOf(Writer)).toThrow(TestSetupError);
    },
  );
});

describe("AC12: slices — one component of the real app on its own", () => {
  test("app.tool(X) runs the tool with its real dependencies", async ({ app }) => {
    expect(await app.tool(OrderStatus).invoke({ orderId: "9" })).toEqual({
      kind: "ok",
      value: { status: "order 9 shipped" },
    });
  });

  test("app.router(X) decides on a text and returns the chosen node", async ({ app, modelOf }) => {
    modelOf(MainRouter).respond(decide(Writer));

    expect(await app.router(MainRouter).decide("write a reply")).toBe(Writer);
    expect(modelOf(MainRouter).onlyRequest).toMatchObject({ input: "write a reply" });
  });

  test("app.agent(X) answers a task with its own model, prompt and tools", async ({
    app,
    modelOf,
  }) => {
    modelOf(Support).respond(callTool(OrderStatus, { orderId: "3" }), answer("Order 3 shipped."));

    expect(await app.agent(Support).answer("where is 3?")).toBe("Order 3 shipped.");
    expect(modelOf(Support)).toHaveCalledTools([OrderStatus]);
  });

  test("a slice of something the workflow does not have fails clearly", async ({ app }) => {
    await expect(app.router(Writer).decide("x")).rejects.toThrow(
      "app.router(Writer): not a router of this workflow",
    );
    await expect(app.agent(MainRouter).answer("x")).rejects.toThrow(
      "app.agent(MainRouter): not an agent of this workflow",
    );
  });

  test("app.router(X) fails like the flow when its model fails", async ({ app, modelOf }) => {
    modelOf(MainRouter).respond(failWith(ModelFailure.ServerError));

    await expect(app.router(MainRouter).decide("x")).rejects.toFailWith({
      code: "router.failed",
      node: MainRouter,
    });
  });
});
