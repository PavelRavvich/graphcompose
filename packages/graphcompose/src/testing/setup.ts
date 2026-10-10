/**
 * `graphcompose/testing/setup` — registers the workflow matchers (`toFollowPath`, `toFinishWith`,
 * …): one line in vitest.config.ts, `setupFiles: ["graphcompose/testing/setup"]`.
 */
import { expect } from "vitest";
import { workflowMatchers } from "./matchers.js";
import "./vitest-types.js";

expect.extend(workflowMatchers);
