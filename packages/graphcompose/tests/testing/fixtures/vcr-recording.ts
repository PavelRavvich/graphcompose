import { MemorySaver } from "@langchain/langgraph";
import { buildApp } from "../../../src/app/create-app.js";
import type { ExecutionOutput } from "../../../src/app/types.js";
import { workflowOf } from "../../../src/components/assemble.js";
import { createMemoryLedger } from "../../../src/finops/ledger.js";
import { createSqliteTernStore } from "../../../src/terns/index.js";
import { McpStubs, stubbedMcpConnect } from "../../../src/testing/mcp-stubs.js";
import { ScriptBook } from "../../../src/testing/script-book.js";
import { createScriptedGateway } from "../../../src/testing/scripted-gateway.js";
import { Cassette } from "../../../src/testing/vcr-cassette.js";
import { vcrGateway } from "../../../src/testing/vcr.js";
import { ChatStart, Desk } from "./desk.workflow.js";

/**
 * Records a run of Desk into `file` the way `vcr: { mode: RECORD }` does, with the scripted
 * models standing in for the real providers (no key here): what replay must reproduce.
 */
export async function recordDesk(
  file: string,
  text: string,
  script: (book: ScriptBook) => void,
): Promise<ExecutionOutput> {
  const book = new ScriptBook();
  script(book);
  const { app } = await buildApp(await workflowOf(Desk), {
    processEnv: {},
    gateway: vcrGateway(Cassette.recording(file), () => createScriptedGateway(book)),
    connectMcp: stubbedMcpConnect(new McpStubs(book), new Map(), new Set()),
    stores: {
      checkpointer: new MemorySaver(),
      ledger: createMemoryLedger(),
      terns: createSqliteTernStore(":memory:"),
    },
    newRunId: () => "run-1",
  });
  try {
    return await app.execute(ChatStart, { text });
  } finally {
    await app.close();
  }
}
