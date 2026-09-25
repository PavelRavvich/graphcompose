import { z } from "zod";
import {
  Agent,
  Workflow,
  Injectable,
  InjectionToken,
  McpServer,
  McpTool,
  ROUTER_FACTORY,
  Tool,
  type ToolHandler,
} from "../../../src/components/index.js";
import type { Router } from "../../../src/routers/index.js";
import { testConfig } from "../../helpers.js";

export const GREETING = new InjectionToken<string>("GREETING");

@Injectable({ deps: [GREETING, ROUTER_FACTORY] })
export class Greeter {
  constructor(
    readonly greeting: string,
    readonly router: (name: string) => Router,
  ) {}
  greet(name: string): string {
    return `${this.greeting}, ${name}`;
  }
}

const GreetInput = z.object({ name: z.string() });
const GreetOutput = z.string();

@Tool({
  name: "greet",
  description: "Greets a person.",
  input: GreetInput,
  output: GreetOutput,
  deps: [Greeter],
})
export class GreetTool implements ToolHandler<typeof GreetInput, typeof GreetOutput> {
  constructor(private readonly greeter: Greeter) {}
  run(input: { name: string }): Promise<string> {
    return Promise.resolve(this.greeter.greet(input.name));
  }
}

@McpServer({ name: "files", transport: "stdio", command: "files-server" })
export class FilesServer {}

@McpTool({
  server: FilesServer,
  tool: "read",
  description: "Read a file.",
  input: z.object({ path: z.string() }),
  output: z.string(),
})
export class ReadFile {}

@Agent({
  name: "greeter",
  description: "Greets people",
  model: "test/alpha",
  price: testConfig.agents.alpha.price,
  thinking: "low",
  tools: [GreetTool, ReadFile],
  prompt: new URL("./greeter.prompt.md", import.meta.url),
})
export class GreeterAgent {}

@Workflow({
  name: "greetings",
  version: "1.0.0",
  defaults: testConfig.defaults,
  budget: testConfig.budget,
  routers: testConfig.routers,
  agents: [GreeterAgent],
  mcp: [FilesServer],
  providers: [Greeter, { provide: GREETING, useValue: "Shalom" }],
  promptVariables: { language: "Hebrew" },
})
export class Greetings {}
