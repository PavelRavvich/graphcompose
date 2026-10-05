import { file } from "../../../src/components/file.js";

import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  Agent,
  Injectable,
  McpServer,
  McpServerClient,
  McpTool,
  MODEL_MAX,
  Tool,
  Workflow,
  writeToolsNeedApproval,
  type OnStart,
  type OnStop,
  type ToolHandler,
} from "../../../src/index.js";
import { Text, WorkflowFinishText, WorkflowStartText } from "../../../src/dto/index.js";
import {
  from,
  route,
  Router,
  WorkflowFinish,
  WorkflowSettings,
  WorkflowStart,
  type WorkflowDefinition,
} from "../../../src/graph/index.js";
import { usd } from "../../../src/units/index.js";

/** What the lifecycle hooks of real components did, in order (the lifecycle tests read it). */
export const lifecycle: string[] = [];

/** A service with lifecycle hooks: started when the app is built, stopped when it closes. */
@Injectable()
export class OrderBook implements OnStart, OnStop {
  onStart(): void {
    lifecycle.push("OrderBook.onStart");
  }

  onStop(): void {
    lifecycle.push("OrderBook.onStop");
  }

  statusOf(orderId: string): Promise<string> {
    return Promise.resolve(`order ${orderId} shipped`);
  }
}

export class OrderQuery {
  @Text({ prompt: "the order id" })
  orderId!: string;
}

export class OrderInfo {
  @Text()
  status!: string;
}

@Tool({
  name: "order_status",
  description: "The status of an order",
  input: OrderQuery,
  output: OrderInfo,
  deps: [OrderBook],
})
export class OrderStatus implements ToolHandler<OrderQuery, OrderInfo> {
  constructor(private readonly book: OrderBook) {}

  async run({ orderId }: OrderQuery): Promise<OrderInfo> {
    return { status: await this.book.statusOf(orderId) };
  }
}

class FileRead {
  @Text() path!: string;
}

class FileContent {
  @Text() content!: string;
}

class FileWrite {
  @Text() path!: string;
  @Text() content!: string;
}

class FileWritten {
  @Text() content!: string;
}

/** The folder the notes server may touch. */
export const NOTES_DIR = tmpdir();

const FILESYSTEM_SERVER = join(
  dirname(
    createRequire(import.meta.url).resolve("@modelcontextprotocol/server-filesystem/package.json"),
  ),
  "dist",
  "index.js",
);

const notesTools = {
  read_text_file: { input: FileRead, output: FileContent },
  write_file: { input: FileWrite, output: FileWritten },
};

/** A real MCP server (the official filesystem server, a local process — no network). */
@McpServer({
  name: "notes",
  transport: "stdio",
  command: process.execPath,
  args: [FILESYSTEM_SERVER, NOTES_DIR],
  tools: notesTools,
})
export class NotesServer extends McpServerClient<typeof notesTools> {}

export class Note {
  @Text() title!: string;
  @Text() text!: string;
}

export class NoteRef {
  @Text() title!: string;
}

export class NoteText {
  @Text() text!: string;
}

const notePath = (title: string): string => join(NOTES_DIR, `${title}.md`);

@McpTool({
  server: NotesServer,
  name: "save_note",
  description: "Saves a note",
  effect: "write",
  input: Note,
  output: NoteRef,
  deps: [NotesServer],
})
export class SaveNote implements ToolHandler<Note, NoteRef> {
  constructor(private readonly server: NotesServer) {}

  async run({ title, text }: Note): Promise<NoteRef> {
    await this.server.call("write_file", { path: notePath(title), content: text });
    return { title };
  }
}

@McpTool({
  server: NotesServer,
  name: "read_note",
  description: "Reads a note",
  input: NoteRef,
  output: NoteText,
  deps: [NotesServer],
})
export class ReadNote implements ToolHandler<NoteRef, NoteText> {
  constructor(private readonly server: NotesServer) {}

  async run({ title }: NoteRef): Promise<NoteText> {
    return { text: (await this.server.call("read_text_file", { path: notePath(title) })).content };
  }
}

const price = { inputPerMTok: 1, outputPerMTok: 10 };

@Agent({
  name: "support",
  instructions: "./support.prompt.md",
  description: "Answers questions about orders and keeps notes",
  model: "test/support",
  price,
  tools: [OrderStatus, ReadNote, SaveNote],
})
export class Support {}

@Agent({
  name: "writer",
  instructions: file("./writer.prompt.md"),
  description: "Writes replies",
  model: "test/writer",
  price,
})
export class Writer {}

@WorkflowStart({ name: "chat", description: "A message", input: WorkflowStartText })
export class ChatStart {}

@WorkflowFinish({ name: "reply", description: "The reply", output: WorkflowFinishText })
export class Reply {}

@Router({
  name: "main",
  description: "Sends the message to an agent, or sends the reply",
  instructions: "Pick who handles the message.",
  model: "typesafe/jev-1.13",
  maxVisits: 4,
  routes: [
    route("Orders and notes").to(Support),
    route("Writing replies").to(Writer),
    route("Stop and send the answer: the contributions answer the message").to(Reply),
  ],
})
export class MainRouter {}

/** The testing toolkit's own workflow: a star with a service, a tool, an MCP server, a pause. */
@Workflow({
  name: "desk",
  version: "1.0.0",
  flow: [
    from(ChatStart).next(MainRouter),
    from(MainRouter).routeOne(Support, Writer, Reply),
    from(Support, Writer).next(MainRouter),
  ],
  defaults: {
    models: { temperature: 0, maxTokens: MODEL_MAX, thinking: "default", cache: true },
    router: { kind: "jev", model: "typesafe/jev-1.13" },
    tools: { maxToolCalls: 4 },
    history: { limit: 4 },
  },
  guards: {
    input: { prompt_injection: { threshold: 0.7, refusal: "I can't help with that." } },
  },
  mcp: [NotesServer],
  providers: [OrderBook],
  needsApproval: writeToolsNeedApproval,
})
export class Desk implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder()
      .limits({ perRun: { steps: 12 }, perDay: { cost: usd(0.05) } })
      .build();
  }
}
