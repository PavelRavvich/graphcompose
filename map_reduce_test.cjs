const { StateGraph, Annotation, Send, END, START } = require("@langchain/langgraph");

const State = Annotation.Root({
  items: Annotation({ reducer: (a, b) => b, default: () => [] }),
  results: Annotation({ reducer: (a, b) => a.concat(b), default: () => [] }),
});

let summaryRuns = 0;
const builder = new StateGraph(State)
  .addNode("worker", (state) => ({ results: state.results }))
  .addNode("summary", (state) => {
    summaryRuns++;
    console.log("Summary run", summaryRuns);
    return {};
  })
  .addConditionalEdges(START, (state) => state.items.map(i => new Send("worker", { results: [i] })))
  .addEdge("worker", "summary");

builder.compile().invoke({ items: [1, 2, 3] }).then(console.log).catch(console.error);
