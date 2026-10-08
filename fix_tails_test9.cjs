const fs = require('fs');
const file = 'packages/graphcompose/tests/core/observability-tails.test.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/class StartNode \{ constructor\(public obs: TailsObserver\) \{\} \}/, 'class StartNode {}');
code = code.replace(/@WorkflowStart\(\{ name: "Start", input: WorkflowStartText, deps: \[TailsObserver\] \}\)/, '@WorkflowStart({ name: "Start", input: WorkflowStartText })');
code = code.replace(/@Tool\(\{\n  name: "SafeTool",\n  description: "Does things",\n  input: ToolInput,\n  output: ToolInput,\n\}\)\nclass SafeTool \{\n  async run\(\)/, '@Tool({\n  name: "SafeTool",\n  description: "Does things",\n  input: ToolInput,\n  output: ToolInput,\n  deps: [TailsObserver]\n})\nclass SafeTool {\n  constructor(public obs: TailsObserver) {}\n  async run()');
code = code.replace(/deps\.container\.get\(TailsObserver\);/, 'deps.tools("SafeTool");');

fs.writeFileSync(file, code);
