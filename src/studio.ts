import "dotenv/config";
import { createAppDeps } from "./app.js";
import { studioGraph } from "./graph/studio-graph.js";

/** Entry for `npm run studio` (LangGraph Studio). */
export const graph = studioGraph(await createAppDeps());
