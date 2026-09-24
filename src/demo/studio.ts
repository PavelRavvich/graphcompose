import "dotenv/config";
import { createAppDeps } from "../app.js";
import { buildGraph } from "../graph/graph.js";
import { demoBundles } from "./index.js";

/** Graphs for LangGraph Studio (`npm run studio`): see langgraph.json. */
export const assistant = buildGraph(
  await createAppDeps(process.env, undefined, demoBundles.assistant),
);
export const approval = buildGraph(
  await createAppDeps(process.env, undefined, demoBundles.approval),
);
