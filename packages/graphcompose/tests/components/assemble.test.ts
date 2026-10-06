import { file } from "../../src/components/file.js";

import { describe, expect, it } from "vitest";
import {
  Agent,
  Workflow,
  workflowOf,
  ComponentError,
  Injectable,
  ROUTER_FACTORY,
  toolOf,
} from "../../src/components/index.js";
import { checkGraph, createContainer } from "../../src/components/container.js";
import { recordComponent } from "../../src/components/metadata.js";
import type { WorkflowServices } from "../../src/workflow.js";
import type { ToolContext } from "../../src/tools/index.js";
import { testConfig } from "../helpers.js";
import {
  FilesServer,
  Greeter,
  GreeterAgent,
  Greetings,
  GreetTool,
  GREETING,
} from "./fixture/components.js";
import { starOf, TestSettings } from "../fixtures/test-flow/star.js";

const services: WorkflowServices = {
  router: (name) => ({ name, route: () => Promise.reject(new Error("unused")) }),
  env: {},
};
const ctx: ToolContext = {
  runId: "r",
  workflow: "b",
  agent: "a",
  callId: "call-1",
  signal: new AbortController().signal,
  pause: () => ({}),
  reportCost: () => undefined,
};

const baseBundle = {
  version: "1.0.0",
  defaults: testConfig.defaults,
};

describe("components — assembly", () => {
  it("AC1: a tool is one annotated class referenced by an agent; the container injects its dependencies", async () => {
    const bundle = await workflowOf(Greetings);
    const tools = typeof bundle.tools === "function" ? bundle.tools(services) : bundle.tools;
    const greet = tools.find((tool) => tool.name === "greet");

    expect(bundle.config.agents.greeter?.tools).toEqual(["greet", "read_file"]);
    expect(await greet?.invoke({ name: "Pavel" }, ctx)).toEqual({
      kind: "ok",
      value: { text: "Shalom, Pavel" },
    });
  });

  it("AC1: a tool is testable with plain `new` and fakes — no container", async () => {
    const tool = toolOf(new GreetTool(new Greeter("Hi", services.router)));

    expect(await tool.invoke({ name: "you" }, ctx)).toEqual({
      kind: "ok",
      value: { text: "Hi, you" },
    });
    expect((await tool.invoke({ nope: 1 }, ctx)).kind).toBe("error");
  });

  it("AC2: agents (settings, prompt file with variables) and MCP servers come from their classes", async () => {
    const bundle = await workflowOf(Greetings);

    expect(bundle.config).toMatchObject({
      name: "greetings",
      version: "1.0.0",
      mcpServers: { files: { transport: "stdio", command: "files-server" } },
    });
    expect(bundle.config.agents.greeter).toMatchObject({
      model: "test/alpha",
      thinking: "low",
      description: "Greets people",
    });
    const text =
      typeof bundle.prompts.greeter === "function"
        ? await bundle.prompts.greeter({} as any)
        : bundle.prompts.greeter;
    expect(text?.trim()).toBe("You greet people in Hebrew.");
    expect(bundle.mcpServers.map((server) => server.name)).toEqual(["files"]);
  });
});

describe("components — errors at assembly", () => {
  it("AC3: an unregistered provider names the component", async () => {
    @Workflow({
      ...baseBundle,
      name: "no-providers",
      flow: starOf(GreeterAgent),
      mcp: [FilesServer],
    })
    class NoProviders extends TestSettings {}

    await expect(workflowOf(NoProviders)).rejects.toThrow(
      'GreetTool: "Greeter" is not registered in @Workflow({ providers })',
    );
  });

  it("AC3: a dependency cycle names the chain", () => {
    const deps: { a?: unknown; b?: unknown } = {};
    @Injectable({ deps: [] })
    class A {}
    @Injectable({ deps: [] })
    class B {}
    recordComponent(A, { kind: "injectable", meta: { deps: [B] } });
    recordComponent(B, { kind: "injectable", meta: { deps: [A] } });

    expect(() => {
      checkGraph([A], [A, B], []);
    }).toThrow("Dependency cycle: A → B → A");
    expect(deps).toEqual({});
  });

  it("AC3: a non-component in tools fails", async () => {
    class Plain {
      readonly plain = true;
    }

    const agent = (prompt: any, tools: (abstract new () => unknown)[] = []) => {
      @Agent({
        name: "a",
        description: "d",
        model: "test/alpha",
        price: testConfig.agents.alpha.price,
        tools,

        instructions: prompt,
      })
      class A {}
      return A;
    };
    const bundleWith = (agentClass: abstract new () => unknown) => {
      @Workflow({ ...baseBundle, name: "x", flow: starOf(agentClass) })
      class B extends TestSettings {}
      return B;
    };
    const prompt = file("./fixture/greeter.prompt.md");

    await expect(workflowOf(bundleWith(agent(prompt, [Plain])))).rejects.toThrow(
      /Plain in an agent's tools is not a @Tool/,
    );
  });

  it("AC3: instances are created once, dependencies before dependants", () => {
    const container = createContainer(
      [Greeter, { provide: GREETING, useValue: "Hey" }],
      new Map([[ROUTER_FACTORY, services.router]]),
    );
    const first = container.get(GreetTool);

    expect(container.get(GreetTool)).toBe(first);
    expect(container.created).toEqual(["Greeter", "GreetTool"]);
  });
});
