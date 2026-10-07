const { StateGraph, Annotation, Send, END, START } = require("@langchain/langgraph");

const State = Annotation.Root({
  items: Annotation({ reducer: (a, b) => b, default: () => [] }),
  results: Annotation({ reducer: (a, b) => a.concat(b), default: () => [] }),
  offset: Annotation({ reducer: (a, b) => b, default: () => 0 }),
});

const builder = new StateGraph(State)
  .addNode("scatter", (state) => {
    // Just a normal node to hold any pre-scatter logic if needed
    console.log("Scatter node at offset", state.offset);
    return {};
  })
  .addNode("worker", (state) => {
    console.log("Worker processing", state.results[0]);
    return { results: state.results };
  })
  .addNode("loop_check", (state) => {
    console.log("Loop check, offset =", state.offset);
    return { offset: state.offset + 2 };
  })
  .addNode("summary", (state) => {
    console.log("Summary got", state.results);
    return {};
  });

builder.addEdge(START, "scatter");

builder.addConditionalEdges("scatter", (state) => {
  const batch = state.items.slice(state.offset, state.offset + 2);
  console.log("Scattering batch", batch);
  return batch.map(i => new Send("worker", { results: [i], offset: state.offset }));
});

builder.addEdge("worker", "loop_check");

builder.addConditionalEdges("loop_check", (state) => {
  if (state.offset < state.items.length) {
    return "scatter";
  }
  return "summary";
});

builder.addEdge("summary", END);

builder.compile().invoke({ items: [1, 2, 3, 4, 5] }).then(console.log).catch(console.error);
