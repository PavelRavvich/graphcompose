import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { namesOf } from "./names.js";
import type { Changes, FileToWrite } from "./write.js";
import { targetWorkflow } from "./project-files.js";

function getDtoType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined): { tsType: string; decorator: string; itemTsType?: string; itemDecorator?: string; isArray?: boolean } {
  if (!schema) return { tsType: "unknown", decorator: "Property" };
  // simple resolution, assuming fully dereferenced
  const sch = schema as OpenAPIV3.SchemaObject;
  if (sch.type === "string") return { tsType: "string", decorator: "Text" };
  if (sch.type === "integer") return { tsType: "number", decorator: "Integer" };
  if (sch.type === "number") return { tsType: "number", decorator: "Decimal" };
  if (sch.type === "boolean") return { tsType: "boolean", decorator: "Flag" };
  if (sch.type === "array") {
     const item = getDtoType(sch.items);
     return { tsType: `${item.tsType}[]`, decorator: `ListOf`, itemDecorator: item.decorator, isArray: true };
  }
  if (sch.type === "object") {
     return { tsType: "Record<string, unknown>", decorator: "Property" }; // Fallback
  }
  return { tsType: "unknown", decorator: "Property" };
}

/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/prefer-nullish-coalescing */
export async function planOpenApi(root: string, name: string, options: { url?: string; workflow?: string }): Promise<Changes> {
  const url = options.url;
  if (!url) throw new Error("--url <openapi-url> is required for openapi generation");

  const api = await SwaggerParser.dereference(url) as OpenAPIV3.Document;
  const { dir } = targetWorkflow(root, options.workflow ?? "", "tool");
  
  const files: FileToWrite[] = [];
  const ns = namesOf(name);
  
  let toolsContent = `import { Tool, type ToolContext, type ToolHandler } from "graphcompose/tool";\n`;
  toolsContent += `import { Text, Integer, Decimal, Flag, ListOf, Nested } from "graphcompose/dto";\n\n`;

  const tools: string[] = [];
  const dtosContent: string[] = [];

  for (const [path, methods] of Object.entries(api.paths)) {
    if (!methods) continue;
    for (const [method, operation] of Object.entries(methods)) {
      if (method === "parameters" || method === "summary" || method === "description") continue;
      const op = operation as OpenAPIV3.OperationObject;
      const opId = op.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const opName = namesOf(opId);

      // Generate DTO
      let dto = `export class ${opName.pascal}Input {\n`;
      const params = op.parameters || [];
      for (const p of params) {
         const param = p as OpenAPIV3.ParameterObject;
         const pType = getDtoType(param.schema);
         const required = param.required ? "!" : "?";
         
         if (pType.isArray && pType.itemDecorator) {
             dto += `  @${pType.decorator}(${pType.itemDecorator}, { prompt: ${JSON.stringify(param.description || "")} })\n`;
         } else {
             dto += `  @${pType.decorator}({ prompt: ${JSON.stringify(param.description || "")} })\n`;
         }
         dto += `  ${param.name.replace(/[^a-zA-Z0-9]/g, "")}${required}: ${pType.tsType};\n`;
      }
      dto += `}\n\n`;
      dtosContent.push(dto);

      // Generate Tool
      let tool = `@Tool({\n`;
      tool += `  name: "${opId}",\n`;
      tool += `  description: ${JSON.stringify(op.summary || op.description || opId)},\n`;
      tool += `  input: ${opName.pascal}Input,\n`;
      tool += `})\n`;
      tool += `export class ${opName.pascal}Tool implements ToolHandler<${opName.pascal}Input, any> {\n`;
      tool += `  async run(input: ${opName.pascal}Input, ctx: ToolContext): Promise<any> {\n`;
      tool += `    // Generated fetch execution for ${method.toUpperCase()} ${path}\n`;
      tool += `    const url = \`${api.servers?.[0]?.url || "http://localhost"}${path}\`;\n`;
      tool += `    // Inject query/path parameters dynamically here based on input\n`;
      tool += `    const res = await fetch(url, {\n`;
      tool += `      method: "${method.toUpperCase()}",\n`;
      tool += `      headers: { "Content-Type": "application/json" },\n`;
      tool += `      // body: JSON.stringify(input)\n`;
      tool += `    });\n`;
      tool += `    return res.json();\n`;
      tool += `  }\n`;
      tool += `}\n\n`;
      
      tools.push(tool);
    }
  }

  const fileContent = toolsContent + dtosContent.join("") + tools.join("");

  files.push({
    path: `${dir}/${ns.kebab}.openapi.ts`,
    content: fileContent
  });

  return { create: files, modify: [] };
}
