import { describe, expect, it } from "vitest";
import { createApp } from "../../../src/app/create-app.js";
import { ComponentError, Injectable, type OnAgentStart } from "../../../src/core/index.js";
import { closestHook } from "../../../src/components/observer-checks.js";
import { ScriptBook } from "../../../src/testing/script-book.js";
import { createScriptedGateway } from "../../../src/testing/scripted-gateway.js";
import { createSqliteTernStore } from "../../../src/terns/index.js";
import { workflowWith } from "./fixture.js";

/** A typo next to a real hook: compiles, rejected at assembly with the hook it meant. */
@Injectable()
class TypoObserver implements OnAgentStart {
  onAgentStart(): void {
    /* real hook */
  }
  onAgentStarted(): void {
    /* never a hook */
  }
}

/** No hook at all. */
@Injectable()
class EmptyObserver {}

/** Only a misspelled hook: rejected by `tsc` already, and at assembly. */
@Injectable()
class OnlyTypo {
  onToolFinish(): void {
    /* never a hook */
  }
}

/** Lifecycle hooks are not observer hooks, and not typos either. */
@Injectable()
class LifecycleObserver implements OnAgentStart {
  onStart(): void {
    /* lifecycle */
  }
  onAgentStart(): void {
    /* real hook */
  }
}

const assemblyError = async (observers: Parameters<typeof workflowWith>[1]): Promise<string> =>
  createApp(workflowWith("checked", observers), {
    processEnv: {},
    gateway: createScriptedGateway(new ScriptBook()),
    stores: { terns: createSqliteTernStore(":memory:") },
  }).then(
    async (app) => {
      await app.close();
      return "assembled";
    },
    (error: unknown) => (error instanceof ComponentError ? error.message : String(error)),
  );

describe("@Workflow observers are checked at assembly", () => {
  it("rejects a misspelled hook with a did-you-mean", async () => {
    expect(await assemblyError([TypoObserver])).toBe(
      "[observer.unknown-hook] TypoObserver.onAgentStarted is not an observer hook — did you mean onAgentStart?",
    );
  });

  it("rejects an observer that implements no hook", async () => {
    expect(await assemblyError([EmptyObserver])).toMatch(
      /^\[observer\.no-hooks\] EmptyObserver is listed in @Workflow observers but implements no hook/,
    );
  });

  it("rejects a class with only a misspelled hook, at tsc and at assembly", async () => {
    // @ts-expect-error — OnlyTypo shares no hook with WorkflowObserver
    expect(await assemblyError([OnlyTypo])).toContain("did you mean onToolEnd?");
  });

  it("accepts lifecycle hooks next to observer hooks", async () => {
    expect(await assemblyError([LifecycleObserver])).toBe("assembled");
  });

  it("suggests the closest hook", () => {
    expect(closestHook("onWorkflowStarted")).toBe("onWorkflowStart");
    expect(closestHook("onEror")).toBe("onError");
    expect(closestHook("onToolFinish")).toBe("onToolEnd");
  });
});
