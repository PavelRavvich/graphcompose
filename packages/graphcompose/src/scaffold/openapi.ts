import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { namesOf } from "./names.js";
import type { Changes, FileToWrite } from "./write.js";
import { targetWorkflow } from "./project-files.js";

function getDtoType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined): {
  tsType: string;
  decorator: string;
  itemTsType?: string;
  itemDecorator?: string;
  isArray?: boolean;
} {
  if (!schema) return { tsType: "unknown", decorator: "Property" };
  // simple resolution, assuming fully dereferenced
  const sch = schema as OpenAPIV3.SchemaObject;
  if (sch.type === "string") return { tsType: "string", decorator: "Text" };
  if (sch.type === "integer") return { tsType: "number", decorator: "Integer" };
  if (sch.type === "number") return { tsType: "number", decorator: "Decimal" };
  if (sch.type === "boolean") return { tsType: "boolean", decorator: "Flag" };
  if (sch.type === "array") {
    const item = getDtoType(sch.items);
    return {
      tsType: `${item.tsType}[]`,
      decorator: `ListOf`,
      itemDecorator: item.decorator,
      isArray: true,
    };
  }
  if (sch.type === "object") {
    return { tsType: "Record<string, unknown>", decorator: "Property" }; // Fallback
  }
  return { tsType: "unknown", decorator: "Property" };
}

/** `value` unless it is missing or empty, else `fallback`. */
const orElse = (value: string | undefined, fallback: string): string =>
  value !== undefined && value !== "" ? value : fallback;

interface Operation {
  readonly path: string;
  readonly method: string;
  readonly op: OpenAPIV3.OperationObject;
}

function operationsOf(api: OpenAPIV3.Document): Operation[] {
  const operations: Operation[] = [];
  for (const [path, methods] of Object.entries(api.paths)) {
    if (!methods) continue;
    for (const [method, operation] of Object.entries(methods)) {
      if (method === "parameters" || method === "summary" || method === "description") continue;
      operations.push({ path, method, op: operation as OpenAPIV3.OperationObject });
    }
  }
  return operations;
}

function dtoSource(op: OpenAPIV3.OperationObject, pascal: string): string {
  let dto = `export class ${pascal}Input {\n`;
  const params = op.parameters ?? [];
  for (const p of params) {
    const param = p as OpenAPIV3.ParameterObject;
    const pType = getDtoType(param.schema);
    const required = param.required ? "!" : "?";
    const prompt = JSON.stringify(orElse(param.description, ""));

    if (pType.isArray && pType.itemDecorator) {
      dto += `  @${pType.decorator}(${pType.itemDecorator}, { prompt: ${prompt} })\n`;
    } else {
      dto += `  @${pType.decorator}({ prompt: ${prompt} })\n`;
    }
    dto += `  ${param.name.replace(/[^a-zA-Z0-9]/g, "")}${required}: ${pType.tsType};\n`;
  }
  dto += `}\n\n`;
  return dto;
}

function toolSource(
  { path, method, op }: Operation,
  opId: string,
  pascal: string,
  baseUrl: string,
): string {
  let tool = `@Tool({\n`;
  tool += `  name: "${opId}",\n`;
  tool += `  description: ${JSON.stringify(orElse(op.summary, orElse(op.description, opId)))},\n`;
  tool += `  input: ${pascal}Input,\n`;
  tool += `})\n`;
  tool += `export class ${pascal}Tool implements ToolHandler<${pascal}Input, any> {\n`;
  tool += `  async run(input: ${pascal}Input, ctx: ToolContext): Promise<any> {\n`;
  tool += `    // Generated fetch execution for ${method.toUpperCase()} ${path}\n`;
  tool += `    const url = \`${baseUrl}${path}\`;\n`;
  tool += `    // Inject query/path parameters dynamically here based on input\n`;
  tool += `    const res = await fetch(url, {\n`;
  tool += `      method: "${method.toUpperCase()}",\n`;
  tool += `      headers: { "Content-Type": "application/json" },\n`;
  tool += `      // body: JSON.stringify(input)\n`;
  tool += `    });\n`;
  tool += `    return res.json();\n`;
  tool += `  }\n`;
  tool += `}\n\n`;
  return tool;
}

export async function planOpenApi(
  root: string,
  name: string,
  options: { url?: string; workflow?: string },
): Promise<Changes> {
  const url = options.url;
  if (!url) throw new Error("--url <openapi-url> is required for openapi generation");

  const api = (await SwaggerParser.dereference(url)) as OpenAPIV3.Document;
  const { dir } = targetWorkflow(root, options.workflow ?? "", "tool");

  const files: FileToWrite[] = [];
  const ns = namesOf(name);

  let toolsContent = `import { Tool, type ToolContext, type ToolHandler } from "graphcompose/tool";\n`;
  toolsContent += `import { Text, Integer, Decimal, Flag, ListOf, Nested } from "graphcompose/dto";\n\n`;

  const tools: string[] = [];
  const dtosContent: string[] = [];
  const baseUrl = orElse(api.servers?.[0]?.url, "http://localhost");

  for (const operation of operationsOf(api)) {
    const { path, method, op } = operation;
    const opId = orElse(op.operationId, `${method}${path.replace(/[^a-zA-Z0-9]/g, "_")}`);
    const opName = namesOf(opId);
    dtosContent.push(dtoSource(op, opName.pascal));
    tools.push(toolSource(operation, opId, opName.pascal, baseUrl));
  }

  const fileContent = toolsContent + dtosContent.join("") + tools.join("");

  files.push({
    path: `${dir}/${ns.kebab}.openapi.ts`,
    content: fileContent,
  });

  return { create: files, modify: [] };
}
