import { StateGraph, Annotation, interrupt, Command } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";

const State = Annotation.Root({ val: Annotation<string>() });
let apiCalls = 0;

const graph = new StateGraph(State)
  .addNode("worker", async (state) => {
    apiCalls++;
    console.log("API CALLS:", apiCalls);
    const res = interrupt(`pause`);
    console.log("resumed with", res);
    return { val: "done:" + res };
  })
  .addEdge("__start__", "worker")
  .addEdge("worker", "__end__");

const app = graph.compile({ checkpointer: new MemorySaver() });

async function main() {
  const thread = { configurable: { thread_id: "1" } };
  await app.invoke({}, thread);
  await app.invoke(new Command({ resume: "answer" }), thread);
}
main().catch(console.error);
