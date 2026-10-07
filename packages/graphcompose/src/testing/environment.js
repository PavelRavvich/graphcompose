import { MemorySaver } from "@langchain/langgraph";
import { buildApp } from "../app/create-app.js";
import { createMemoryPausedRunRepository } from "../app/paused-runs.js";
import { flowNodesByKey } from "../app/result.js";
import { workflowOf } from "../components/assemble.js";
import { createMemoryLedger } from "../finops/ledger.js";
import { isNamedNode, labelOf } from "../graph/flow.js";
import { nodeInfoOf } from "../graph/node-kind.js";
import { createSqliteTernStore } from "../terns/index.js";
import { createTestClock } from "./clock.js";
import { TestSetupError } from "./errors.js";
import { nodeNameOf } from "./failure-facts.js";
import { McpStubs, stubbedMcpConnect } from "./mcp-stubs.js";
import { mockInstanceOf } from "./mocks.js";
import { ScriptBook } from "./script-book.js";
import { createScriptedGateway, routerKeyOf } from "./scripted-gateway.js";
import { mcpServersOf, usedComponentsOf } from "./workflow-parts.js";
/** The process env without tracing keys: tests never export traces. */
const testEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("LANGFUSE_")));
/** The script key of a flow node that calls a model (an agent or a router). */
function scriptKeyOf(target) {
    const kind = nodeInfoOf(isNamedNode(target) ? target.use : target)?.kind;
    if (kind === "agent")
        return `agent:${nodeNameOf(target)}`;
    if (kind === "router")
        return routerKeyOf(nodeNameOf(target));
    return undefined;
}
/** The names of the MCP servers kept real; anything else in `real` is a setup error. */
function realServers(servers, real) {
    return new Set(real.map((cls) => {
        const name = servers.get(cls);
        if (name === undefined) {
            throw new TestSetupError(`real: [${cls.name}] — not an MCP server of this workflow`);
        }
        return name;
    }));
}
/**
 * Everything one test owns: scripts, mocks, MCP stubs, a controllable clock, deterministic ids and
 * memory stores (checkpoints, spend, Terns, paused runs) — shared by every app of the test, so a
 * run resumed after `restartApp()` continues; never shared between tests.
 */
export class TestEnvironment {
    workflow;
    book = new ScriptBook();
    clock = createTestClock();
    mcp = new McpStubs(this.book);
    #mocks = new Map();
    #apps = [];
    #nodes;
    #options;
    #threads = 0;
    #runs = 0;
    #terns = createSqliteTernStore(":memory:", this.clock.now, () => {
        this.#threads += 1;
        return `thread-${String(this.#threads)}`;
    });
    constructor(workflow, nodes, options) {
        this.workflow = workflow;
        this.#nodes = new Set(nodes);
        for (const node of nodes) {
            const key = scriptKeyOf(node);
            if (key !== undefined)
                this.book.name(key, labelOf(node));
        }
        const servers = mcpServersOf(workflow);
        const real = realServers(servers, options.real ?? []);
        const labels = new Map([...servers].map(([cls, name]) => [name, cls.name]));
        this.#options = {
            env: testEnv(),
            gateway: createScriptedGateway(this.book),
            connectMcp: stubbedMcpConnect(this.mcp, labels, real),
            stores: {
                checkpointer: new MemorySaver(),
                ledger: createMemoryLedger(this.clock.now),
                terns: this.#terns,
            },
            clock: this.clock.now,
            newRunId: () => {
                this.#runs += 1;
                return `run-${String(this.#runs)}`;
            },
            container: { overrides: this.#mocks },
            pausedRuns: createMemoryPausedRunRepository(),
        };
    }
    /** Assembles the workflow once up front: every assembly error fails the test before it runs. */
    static async of(workflow, options = {}) {
        const assembled = await workflowOf(workflow);
        return new TestEnvironment(workflow, [...flowNodesByKey(assembled.flow).values()], options);
    }
    /** A new app over this test's state (the real container and graph, everything external replaced). */
    async newApp() {
        const built = await buildApp(await workflowOf(this.workflow), this.#options);
        this.#apps.push(built);
        return built;
    }
    modelOf(target) {
        const key = scriptKeyOf(target);
        if (key === undefined || !this.#nodes.has(target)) {
            throw new TestSetupError(`modelOf(${labelOf(target)}): not an agent or router of this workflow`);
        }
        return this.book.scriptOf(key);
    }
    mockOf(cls) {
        const existing = this.#mocks.get(cls);
        // the mock stored for this class was created by mockInstanceOf(cls) below
        if (existing !== undefined)
            return existing;
        if (!usedComponentsOf(this.workflow).has(cls)) {
            throw new TestSetupError(`mockOf(${cls.name}): not a component of this workflow`);
        }
        if (this.#apps.length > 0) {
            throw new TestSetupError(`mockOf(${cls.name}) after the app started: call it before the first app.execute(…)`);
        }
        const mock = mockInstanceOf(cls);
        this.#mocks.set(cls, mock);
        return mock;
    }
    mcpOf(server) {
        const name = mcpServersOf(this.workflow).get(server);
        if (name === undefined) {
            throw new TestSetupError(`mcpOf(${server.name}): not an MCP server of this workflow`);
        }
        return this.mcp.stubOf(name);
    }
    /** Closes every app (their `onStop` hooks) and the test's stores. */
    async close() {
        try {
            for (const built of this.#apps)
                await built.app.close();
        }
        finally {
            this.#terns.close();
        }
    }
}
