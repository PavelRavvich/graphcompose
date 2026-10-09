import { describe, expect, it } from "vitest";
import { createApp } from "../../src/index.js";
import { McpServer, createMcpService } from "../../src/index.js";
import { ScriptBook } from "../../src/testing/script-book.js";
import { createScriptedGateway } from "../../src/testing/scripted-gateway.js";
import { createSqliteTernStore } from "../../src/terns/index.js";
import { createMemoryLedger } from "../../src/finops/ledger.js";
import { stubbedMcpConnect, McpStubs } from "../../src/testing/mcp-stubs.js";
import { Desk, Support } from "../testing/fixtures/desk.workflow.js";
import type { AppOptions } from "../../src/app/create-app.js";

function offline(book: ScriptBook): AppOptions {
  return {
    env: {},
    gateway: createScriptedGateway(book),
    stores: { terns: createSqliteTernStore(":memory:"), ledger: createMemoryLedger() },
    connectMcp: stubbedMcpConnect(new McpStubs(book), new Map(), new Set()),
  };
}

@McpServer({
  name: "test-server",
  version: "1.0.0",
  exports: [Support, Desk],
})
class MyMcpServer {}

describe("McpService", () => {
  it("should create service and read exports", async () => {
    const app = await createApp(Desk, offline(new ScriptBook()));
    const service = createMcpService(app, MyMcpServer);

    expect(service).toBeDefined();
    expect((service as any).options.name).toBe("test-server");
  });
});
