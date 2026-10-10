/**
 * `graphcompose/channels` — deprecated (#195): the built-in user channels moved to the root entry
 * `graphcompose`. `gc migrate imports` rewrites the imports; this entry is removed in the next
 * minor release.
 */
export {
  /** @deprecated Import from "graphcompose" (#195). */
  AutoApproveChannel,
  /** @deprecated Import from "graphcompose" (#195). */
  AutoRejectChannel,
  /** @deprecated Import from "graphcompose" (#195). */
  TerminalUserChannel,
} from "../index.js";
