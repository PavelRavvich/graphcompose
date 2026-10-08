const fs = require("fs");
const file = "packages/graphcompose/src/core/observability.ts";
let code = fs.readFileSync(file, "utf-8");

code = code.replace(/variables\?: Record<string, any>;/g, "variables?: Record<string, unknown>;");
code = code.replace(/history\?: any\[\];/g, "history?: unknown[];");

code = code.replace(
  /export interface AgentContext \{/g,
  "export interface AgentContext<I = unknown> {",
);
code = code.replace(
  /export interface AgentContextUpdate \{/g,
  "export interface AgentContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface RouterContext \{/g,
  "export interface RouterContext<I = unknown> {",
);
code = code.replace(
  /export interface RouterContextUpdate \{/g,
  "export interface RouterContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface RagContext \{/g,
  "export interface RagContext<I = unknown> {",
);
code = code.replace(
  /export interface RagContextUpdate \{/g,
  "export interface RagContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface ToolContext \{/g,
  "export interface ToolContext<A = unknown> {",
);
code = code.replace(
  /export interface ToolContextUpdate \{/g,
  "export interface ToolContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface GuardrailContext \{/g,
  "export interface GuardrailContext<I = unknown> {",
);
code = code.replace(
  /export interface GuardrailContextUpdate \{/g,
  "export interface GuardrailContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface PiiPolicyContext \{/g,
  "export interface PiiPolicyContext<I = unknown> {",
);
code = code.replace(
  /export interface PiiPolicyContextUpdate \{/g,
  "export interface PiiPolicyContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface WorkflowActionContext \{/g,
  "export interface WorkflowActionContext<I = unknown> {",
);
code = code.replace(
  /export interface WorkflowActionContextUpdate \{/g,
  "export interface WorkflowActionContextUpdate<U = unknown> {",
);

code = code.replace(
  /export interface ChannelContext \{/g,
  "export interface ChannelContext<I = unknown> {",
);
code = code.replace(
  /export interface ChannelContextUpdate \{/g,
  "export interface ChannelContextUpdate<U = unknown> {",
);

code = code.replace(/readonly input: any;/g, "readonly input: I;");
code = code.replace(/readonly update: any;/g, "readonly update: U;");
code = code.replace(/readonly arguments: any;/g, "readonly arguments: A;");

code = code.replace(/readonly rawPayload: any;/g, "readonly rawPayload: unknown;");
code = code.replace(/readonly rawContent: any;/g, "readonly rawContent: unknown;");

code = code.replace(
  /onWorkflowEnd\(result: any, state: AppState\)/g,
  "onWorkflowEnd(result: unknown, state: AppState)",
);

fs.writeFileSync(file, code);
