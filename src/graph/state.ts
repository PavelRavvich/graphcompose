import { Annotation } from "@langchain/langgraph";
import type { UsageRecord } from "../finops/usage.js";
import type { ApprovalRecord, PendingApproval } from "../pause/index.js";
import type { Contribution, HistoryTurn } from "./contributions.js";
import type { AttemptRecord } from "./nodes/attempts.js";

/** Router decision meaning "stop and produce the answer". */
export const FINISH = "finish";

const append = <TItem>(left: TItem[], right: TItem[]): TItem[] => left.concat(right);

/** Single source of truth for the graph state. Nodes return only the keys they own. */
export const AgentState = Annotation.Root({
  task: Annotation<string>(),
  /** Previous Terns of the thread, oldest first (loaded once per run). */
  history: Annotation<HistoryTurn[]>({ reducer: (_previous, next) => next, default: () => [] }),
  /** Id of this run (tools and logs). */
  runId: Annotation<string>({ reducer: (_previous, next) => next, default: () => "" }),
  /** Agent chosen by the router, or FINISH. */
  next: Annotation<string>(),
  routeReason: Annotation<string>(),
  /** Number of agent invocations so far (bounded by router.maxHops). */
  hops: Annotation<number>({ reducer: (left, right) => left + right, default: () => 0 }),
  contributions: Annotation<Contribution[]>({ reducer: append, default: () => [] }),
  /** FinOps: spend allowed for this run (run cap ∩ what is left of the bundle's daily cap). */
  budgetUsd: Annotation<number>({
    reducer: (_previous, next) => next,
    default: () => Number.POSITIVE_INFINITY,
  }),
  /** FinOps: every LLM call appends one record. */
  usage: Annotation<UsageRecord[]>({ reducer: append, default: () => [] }),
  answer: Annotation<string>(),
  /** A tool call waiting for a human (pause seam), null otherwise. */
  pending: Annotation<PendingApproval | null>({
    reducer: (_previous, next) => next,
    default: () => null,
  }),
  /** Quality-gated attempts of agents with `reasoning`. */
  attempts: Annotation<AttemptRecord[]>({ reducer: append, default: () => [] }),
  /** Human decisions on tool calls in this run. */
  approvals: Annotation<ApprovalRecord[]>({ reducer: append, default: () => [] }),
  /** Name of the guard that stopped the run, "" if none. */
  guarded: Annotation<string>({ reducer: (_previous, next) => next, default: () => "" }),
});

export type AgentStateType = typeof AgentState.State;
export type AgentStateUpdate = typeof AgentState.Update;
