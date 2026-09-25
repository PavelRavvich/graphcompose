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

const services: WorkflowServices = {
  router: (name) => ({ name, route: () => Promise.reject(new Error("unused")) }),
  env: {},
};
const ctx: ToolContext = {
  runId: "r",
  workflow: "b",
  agent: "a",
  signal: new AbortController().signal,
  reportCost: () => undefined,
};

const baseBundle = {
  version: "1.0.0",
  defaults: testConfig.defaults,
  budget: testConfig.budget,
  routers: testConfig.routers,
};

describe("components — assembly", () => {
  it("AC1: a tool is one annotated class referenced by an agent; the container injects its dependencies", async () => {
    const bundle = await workflowOf(Greetings);
    const tools = typeof bundle.tools === "function" ? bundle.tools(services) : bundle.tools;
    const greet = tools.find((tool) => tool.name === "greet");

    expect(bundle.config.agents.greeter?.tools).toEqual(["greet", "files__read"]);
    expect(await greet?.invoke({ name: "Pavel" }, ctx)).toEqual({
      kind: "ok",
      value: "Shalom, Pavel",
    });
  });

  it("AC1: a tool is testable with plain `new` and fakes — no container", async () => {
    const tool = toolOf(new GreetTool(new Greeter("Hi", services.router)));

    expect(await tool.invoke({ name: "you" }, ctx)).toEqual({ kind: "ok", value: "Hi, you" });
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
    expect(bundle.prompts.greeter?.trim()).toBe("You greet people in Hebrew.");
    expect(bundle.mcpServers.map((server) => server.name)).toEqual(["files"]);
  });
});

describe("components — errors at assembly", () => {
  it("AC3: an unregistered provider names the component", async () => {
    @Workflow({ ...baseBundle, name: "no-providers", agents: [GreeterAgent], mcp: [FilesServer] })
    class NoProviders {}

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

  it("AC3: a non-component in tools, a missing prompt file and an unknown prompt variable fail", async () => {
    class Plain {
      readonly plain = true;
    }
    const agent = (prompt: URL, tools: (abstract new () => unknown)[] = []) => {
      @Agent({
        name: "a",
        description: "d",
        model: "test/alpha",
        price: testConfig.agents.alpha.price,
        tools,
        prompt,
      })
      class A {}
      return A;
    };
    const bundleWith = (agentClass: abstract new () => unknown) => {
      @Workflow({ ...baseBundle, name: "x", agents: [agentClass] })
      class B {}
      return B;
    };
    const prompt = new URL("./fixture/greeter.prompt.md", import.meta.url);

    await expect(workflowOf(bundleWith(agent(prompt, [Plain])))).rejects.toThrow(
      /Plain in an agent's tools is not a @Tool/,
    );
    await expect(
      workflowOf(bundleWith(agent(new URL("./fixture/nope.md", import.meta.url)))),
    ).rejects.toThrow(/prompt file not found/);
    await expect(workflowOf(bundleWith(agent(prompt)))).rejects.toThrow(
      /unknown prompt variable \{\{language\}\}/,
    );
    await expect(workflowOf(Plain)).rejects.toBeInstanceOf(ComponentError);
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
