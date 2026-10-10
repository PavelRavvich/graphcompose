/**
 * `graphcompose/concurrency` — deprecated (#195): the batch and quorum strategies moved to the
 * root entry `graphcompose`. `gc migrate imports` rewrites the imports; this entry is removed in
 * the next minor release.
 */
export {
  /** @deprecated Import from "graphcompose" (#195). */
  BatchParallelStrategy,
  /** @deprecated Import from "graphcompose" (#195). */
  type BatchParallelStrategyMeta,
  /** @deprecated Import from "graphcompose" (#195). */
  batchParallelStrategyMetaOf,
  /** @deprecated Import from "graphcompose" (#195). */
  type BatchParallelStrategyOptions,
  /** @deprecated Import from "graphcompose" (#195). */
  type BranchCancelToken,
  /** @deprecated Import from "graphcompose" (#195). */
  QuorumCancelledError,
  /** @deprecated Import from "graphcompose" (#195). */
  QuorumManager,
  /** @deprecated Import from "graphcompose" (#195). */
  QuorumRouter,
  /** @deprecated Import from "graphcompose" (#195). */
  type QuorumRouterMeta,
  /** @deprecated Import from "graphcompose" (#195). */
  quorumRouterMetaOf,
  /** @deprecated Import from "graphcompose" (#195). */
  type QuorumRouterOptions,
  /** @deprecated Import from "graphcompose" (#195). */
  type QuorumStrategy,
} from "../index.js";
