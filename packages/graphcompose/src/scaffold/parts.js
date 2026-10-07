import { namesOf } from "./names.js";
import { render, vars } from "./plan.js";
/** An MCP server (`<name>.server.ts`) and one MCP tool calling it (`<tool>.mcp.ts`). */
export function mcpFiles(dir, mcp) {
    const n = namesOf(mcp.name);
    const filesystem = mcp.kind === "filesystem";
    const tool = namesOf(filesystem ? `read ${mcp.name}` : `${mcp.name} ${mcp.tool}`);
    const serverTool = filesystem ? "read_text_file" : mcp.tool;
    const typeName = filesystem ? "" : namesOf(mcp.tool).pascal;
    const types = filesystem
        ? { input: "FileRead", output: "FileContent" }
        : { input: `${typeName}Args`, output: `${typeName}Reply` };
    const serverFile = filesystem
        ? render("mcp/filesystem.server.ts.tmpl", { ...vars(n), dir: mcp.dir })
        : render("mcp/command.server.ts.tmpl", {
            ...vars(n),
            command: mcp.command,
            serverTool,
            toolPascal: typeName,
        });
    const description = filesystem
        ? `Read a text file in ${mcp.dir} (absolute path).`
        : `${tool.title} (TODO: say what it does)`;
    const toolFile = render("mcp/tool.mcp.ts.tmpl", {
        ...vars(tool),
        ...types,
        serverPascal: n.pascal,
        serverKebab: n.kebab,
        serverTool,
        description,
    });
    return {
        files: [
            { path: `${dir}/mcp/${n.kebab}.server.ts`, content: serverFile },
            { path: `${dir}/mcp/${tool.kebab}.mcp.ts`, content: toolFile },
        ],
        server: `${n.pascal}Server`,
        serverModule: `mcp/${n.kebab}.server`,
        tool: `${tool.pascal}Tool`,
        toolModule: `mcp/${tool.kebab}.mcp`,
    };
}
export function ragFiles(dir, workflow, rag) {
    const n = namesOf(rag.name);
    const variables = { ...vars(n), folder: rag.folder, workflow: workflow.kebab };
    return {
        files: [
            { path: `${dir}/rag/${n.kebab}.rag.ts`, content: render("rag/knowledge.ts.tmpl", variables) },
            { path: `${rag.folder}/README.md`, content: render("rag/note.md.tmpl", variables) },
        ],
        knowledge: `${n.pascal}Knowledge`,
    };
}
