import { checkVisit } from "./limits.js";
import { isWorkingKind } from "./node-kind.js";
import { QuorumCancelledError } from "../concurrency/quorum-manager.js";
async function daySpentBeforeRun(state, deps) {
  if (state.daySpentBeforeRunUsd !== null) return state.daySpentBeforeRunUsd;
  return deps.limits.dayCostUsd === undefined ? 0 : deps.spentToday();
}
async function joinUpdateOf(node, state) {
  const forks = state.forks;
  if (Object.keys(forks).length === 0) return {};
  try {
    const ClassNode = node.use;
    const instance = new ClassNode();
    if (typeof instance.onJoin === "function") {
      const output = await instance.onJoin(forks);
      const update = {};
      if (output.contributions) {
        update.contributions = output.contributions.map((c) => ({
          agent: c.agent ?? node.name,
          content: c.content,
        }));
      }
      if (output.payload) update.payload = output.payload;
      if (output.update) Object.assign(update, output.update);
      return update;
    }
  } catch {
    // Ignore instantiation errors for nodes without default constructor or onJoin
  }
  return {};
}
function mergeJoinState(state, joinUpdate) {
  const contributions = joinUpdate.contributions
    ? [...state.contributions, ...joinUpdate.contributions]
    : state.contributions;
  const payload = joinUpdate.payload ? { ...state.payload, ...joinUpdate.payload } : state.payload;
  return { ...state, ...joinUpdate, contributions, payload };
}
function mergeJoinUpdate(update, joinUpdate) {
  const contributions =
    joinUpdate.contributions && Array.isArray(update.contributions)
      ? [...joinUpdate.contributions, ...update.contributions]
      : (joinUpdate.contributions ?? update.contributions);
  const payload = joinUpdate.payload
    ? { ...(update.payload ?? {}), ...joinUpdate.payload }
    : update.payload;
  const merged = { ...update };
  if (contributions !== undefined) merged.contributions = contributions;
  if (payload !== undefined) merged.payload = payload;
  return merged;
}
export function visitNode(node, runner, deps, quorumContext) {
  const visited = { visits: { [node.key]: 1 }, path: [node.key] };
  if (!isWorkingKind(node.kind)) {
    return async (state, config) => {
      const joinUpdate = await joinUpdateOf(node, state);
      const res = await runner(mergeJoinState(state, joinUpdate), config);
      return {
        ...res,
        ...visited,
        ...mergeJoinUpdate(res, joinUpdate),
        // we do NOT clear forks for non-working nodes, because they might be intermediate
      };
    };
  }
  return async (state, config) => {
    let branchCancelToken;
    let manager;
    let branchConfig = config;
    if (quorumContext && config?.configurable?.quorumManager) {
      manager = config.configurable.quorumManager;
      branchCancelToken = { cancelled: false };
      manager.registerBranch(
        quorumContext.quorumId,
        quorumContext.min,
        branchCancelToken,
        quorumContext.max,
        quorumContext.timeoutSeconds,
      );
      if (branchCancelToken.cancelled) return {};
      branchConfig = {
        ...config,
        configurable: { ...config.configurable, branchCancelToken },
      };
    }
    const daySpent = await daySpentBeforeRun(state, deps);
    checkVisit(state, {
      node,
      limits: deps.limits,
      daySpentBeforeRunUsd: daySpent,
      ...(deps.maxVisits === undefined ? {} : { maxVisits: deps.maxVisits }),
    });
    try {
      const joinUpdate = await joinUpdateOf(node, state);
      const update = await runner(mergeJoinState(state, joinUpdate), branchConfig);
      if (quorumContext && manager && deps.quorumRouters) {
        const strategy = deps.quorumRouters(quorumContext.routerClass);
        if (strategy) {
          const isVoteValid = await strategy.filterVote({ ...state, ...update });
          manager.addVote(quorumContext.quorumId, isVoteValid);
        }
      }
      return {
        ...update,
        ...visited,
        ...mergeJoinUpdate(update, joinUpdate),
        steps: 1,
        daySpentBeforeRunUsd: daySpent,
        ...(node.kind === "agent" ? { previousAgent: node.key } : {}),
      };
    } catch (err) {
      if (err instanceof QuorumCancelledError) {
        return {};
      }
      if (deps.catchesErrors) {
        return { lastError: err };
      }
      throw err;
    }
  };
}
