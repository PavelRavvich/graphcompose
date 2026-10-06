import { StateGraph, Annotation, interrupt, Command, Send } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";

const State = Annotation.Root({
  tasks: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  results: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

const graph = new StateGraph(State)
  .addNode("start", () => {
    return { tasks: ["a", "b"] };
  })
  .addNode("worker", async (task) => {
    console.log("worker running for", task);
    if (task === "b") {
      const res = interrupt(`pause from ${task}`);
      console.log("worker resumed for", task, "with", res);
      return { results: [task + ":" + res] };
    }
    return { results: [task + ":done"] };
  })
  .addConditionalEdges("start", (state) => state.tasks.map((t) => new Send("worker", t)))
  .addEdge("__start__", "start")
  .addEdge("worker", "__end__");

const checkpointer = new MemorySaver();
const app = graph.compile({ checkpointer });

async function main() {
  const thread = { configurable: { thread_id: "1" } };
  console.log("--- FIRST RUN ---");
  const res1 = await app.invoke({}, thread);
  console.log("Res1:", res1);

  console.log("--- RESUMING ---");
  const res2 = await app.invoke(new Command({ resume: "answer" }), thread);
  console.log("Res2:", res2);
}
main().catch(console.error);
