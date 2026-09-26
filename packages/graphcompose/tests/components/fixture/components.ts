import { z } from "zod";
import {
  Agent,
  Workflow,
  Injectable,
  InjectionToken,
  McpServer,
  McpServerClient,
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
export class GreetTool implements ToolHandler<z.infer<typeof GreetInput>, string> {
  constructor(private readonly greeter: Greeter) {}
  run(input: { name: string }): Promise<string> {
    return Promise.resolve(this.greeter.greet(input.name));
  }
}

const FilePath = z.object({ path: z.string() });
type FilePath = z.infer<typeof FilePath>;
const FileText = z.string();
type FileText = z.infer<typeof FileText>;
const filesTools = { read: { input: FilePath, output: FileText } };

@McpServer({
  name: "files",
  transport: "stdio",
  command: "files-server",
  tools: filesTools,
})
export class FilesServer extends McpServerClient<typeof filesTools> {}

@McpTool({
  server: FilesServer,
  name: "read_file",
  description: "Read a file.",
  input: FilePath,
  output: FileText,
  deps: [FilesServer],
})
export class ReadFile implements ToolHandler<FilePath, FileText> {
  constructor(private readonly files: FilesServer) {}

  run(file: FilePath): Promise<FileText> {
    return this.files.call("read", file);
  }
}

@Agent({
  name: "greeter",
  description: "Greets people",
  model: "test/alpha",
  price: testConfig.agents.alpha.price,
  thinking: "low",
  tools: [GreetTool, ReadFile],
  prompt: "./greeter.prompt.md",
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
