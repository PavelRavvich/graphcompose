const fs = require("fs");
let code = fs.readFileSync(
  "/Users/pavelravvich/projects/langgraph-ts-template.wiki/Advanced-Routing.md",
  "utf-8",
);

const oldSection = `## 4. Dynamic Parallelism (Scatter-Gather / MapEach)
The number of parallel branches is unknown until runtime (data-dependent).

\`\`\`typescript
flow: [
  from(StartNode).next(DispatcherAgent),
  
  // Extracts an array from the state (p.urls) and spawns a ScraperAgent for each element.
  // The join barrier automatically waits for all spawned instances.
  from(DispatcherAgent)
    .nextParallel(ScraperAgent, p => p.urls)
    .join(SummaryAgent),
    
  from(SummaryAgent).next(FinishNode)
]
\`\`\``;

const newSection = `## 4. Dynamic Parallelism (Scatter-Gather / MapEach / BatchParallel)
The number of parallel branches is unknown until runtime (data-dependent). GraphCompose uses LangGraph's \`Send\` API under the hood to dynamically spawn N instances of an agent.

To preserve Dependency Injection and clean architecture, the extraction logic is placed in a dedicated \`@BatchStrategy\` class, rather than an inline lambda.

\`\`\`typescript
import { BatchStrategy, type BatchParallelStrategy } from "graphcompose/concurrency";

// The strategy decides WHICH elements are sent to the dynamic agents
@BatchStrategy({ name: "url_extractor" })
export class UrlExtractor implements BatchParallelStrategy<MyState, string> {
  // Supports DI!
  constructor(private readonly filterService: FilterService) {}

  extract(state: MyState): string[] {
    return this.filterService.filterUrls(state.urls);
  }
}
\`\`\`

\`\`\`typescript
flow: [
  from(WorkflowStart).next(DispatcherAgent),
  
  // Extracts an array from the state via the DI Strategy class.
  // Spawns a ScraperAgent for each element, limited to 5 concurrent instances.
  // The join barrier automatically waits for all spawned instances to finish.
  from(DispatcherAgent)
    .batchParallel(ScraperAgent, UrlExtractor, { concurrency: 5 }),
    
  from(ScraperAgent).join(SummaryAgent),
    
  from(SummaryAgent).routes(WorkflowFinish)
]
\`\`\``;

code = code.replace(oldSection, newSection);
fs.writeFileSync(
  "/Users/pavelravvich/projects/langgraph-ts-template.wiki/Advanced-Routing.md",
  code,
);
