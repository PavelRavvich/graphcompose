import { z } from "zod";
import { McpServer, McpTool } from "../../../components/index.js";
import { DOCS_DIR, FILESYSTEM_SERVER } from "../paths.js";

/** The official filesystem MCP server, limited to the company docs folder. */
@McpServer({ name: "docs", transport: "stdio", command: FILESYSTEM_SERVER, args: [DOCS_DIR] })
export class DocsServer {}

const FileText = z.object({ content: z.string() });

@McpTool({
  server: DocsServer,
  tool: "list_directory",
  description: "List files in a directory of the company docs (absolute path).",
  input: z.object({ path: z.string() }),
  output: FileText,
})
export class ListDocs {}

@McpTool({
  server: DocsServer,
  tool: "read_text_file",
  description: "Read a text file of the company docs (absolute path).",
  input: z.object({ path: z.string() }),
  output: FileText,
})
export class ReadDoc {}
