import "dotenv/config";
import { createAppDeps } from "./app.js";
import { buildGraph } from "./graph/graph.js";

/** Entry for `npm run studio` (LangGraph Studio). */
export const graph = buildGraph(await createAppDeps());
