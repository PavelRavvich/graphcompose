/**
 * Demo bundles — try the core by hand (Wiki → Demo). Remove the demo: delete src/demo/, its import
 * line in src/bundles.ts and the demo-* graphs in langgraph.json.
 */
import { defineBundle } from "../bundle.js";
import { writeToolsNeedApproval } from "../pause/index.js";
import { approvalConfig, assistantConfig } from "./config.js";
import { demoPrompts } from "./prompts.js";
import { demoTools, docsServer } from "./tools.js";

const shared = { prompts: demoPrompts, tools: demoTools, mcpServers: [docsServer] } as const;

export const demoBundles = {
  assistant: defineBundle({ ...shared, config: assistantConfig }),
  approval: defineBundle({
    ...shared,
    config: approvalConfig,
    needsApproval: writeToolsNeedApproval,
  }),
};
