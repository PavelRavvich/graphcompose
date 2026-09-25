/** company-assistant demo: Nimbus Labs docs over MCP, personal notes, coder. See Wiki → Demos. */
import { defineBundle } from "../../bundle.js";
import { writeToolsNeedApproval } from "../../pause/index.js";
import { approvalConfig, assistantConfig } from "./config.js";
import { demoPrompts } from "./prompts.js";
import { demoTools, docsServer } from "./tools.js";

const shared = { prompts: demoPrompts, tools: demoTools, mcpServers: [docsServer] } as const;

export const companyAssistant = defineBundle({ ...shared, config: assistantConfig });

export const companyAssistantApproval = defineBundle({
  ...shared,
  config: approvalConfig,
  needsApproval: writeToolsNeedApproval,
});
