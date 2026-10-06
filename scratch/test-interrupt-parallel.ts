import { StateGraph, Annotation, interrupt, Command } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";

const State = Annotation.Root({
  val: Annotation<string>(),
  b1: Annotation<string>(),
  b2: Annotation<string>(),
});

const graph = new StateGraph(State)
  .addNode("start", () => ({}))
  .addNode("branch1", async () => {
    console.log("branch1 running...");
    const res = interrupt("pause from branch1");
    console.log("branch1 resumed with", res);
    return { b1: "done1:" + res };
  })
  .addNode("branch2", async () => {
    console.log("branch2 running...");
    await new Promise((r) => setTimeout(r, 100)); // ensure branch1 interrupts first
    return { b2: "done2" };
  })
  .addNode("join", (state) => {
    console.log("join saw", state);
    return { val: "joined" };
  })
  .addEdge("__start__", "start")
  .addEdge("start", "branch1")
  .addEdge("start", "branch2")
  .addEdge(["branch1", "branch2"], "join")
  .addEdge("join", "__end__");

const checkpointer = new MemorySaver();
const app = graph.compile({ checkpointer });

async function main() {
  const thread = { configurable: { thread_id: "1" } };
  console.log("--- FIRST RUN ---");
  const res1 = await app.invoke({ val: "init" }, thread);
  console.log("Res1:", res1);

  console.log("--- RESUMING ---");
  const res2 = await app.invoke(new Command({ resume: "answer" }), thread);
  console.log("Res2:", res2);
}
main().catch(console.error);
