import "dotenv/config";
import { stdin, stderr, stdout } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs, styleText } from "node:util";
import { createApp } from "./app/create-app.js";
import { loadWorkflowClass, loadEnvironment } from "./cli/load-workflow.js";
import { memoryLine, summaryLine, threadLine, untilDone } from "./cli/approve.js";
import { costSummary, costTotal, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { textStartOrFail } from "./cli/text-start.js";
// graphcompose run <workflow.ts> --input "Start text" [--thread <id>] [--env <id>]
const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        input: { type: "string" },
        profile: { type: "string" },
        thread: { type: "string" },
        env: { type: "string" },
    },
});
const workflowPath = positionals[0] ?? "./src/workflow.ts";
const inputText = values.input ?? positionals.slice(1).join(" ");
if (!inputText) {
    stderr.write(`Usage: gc run <workflow.ts> --input "Your task here"\n`);
    process.exit(1);
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const env = await loadEnvironment(workflowPath, values.env);
const app = await createApp(await loadWorkflowClass(workflowPath), {
    profile: values.profile,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    env,
});
app.warnings.forEach((warning) => {
    stderr.write(`warning: ${warning}\n`);
});
const rl = createInterface({ input: stdin, terminal: false });
const onStream = (event) => {
    if (event.kind === "textDelta") {
        stdout.write(event.delta);
    }
    else {
        stderr.write(styleText("dim", `\n[Agent is using tool: ${event.tool}]\n`));
    }
};
const busy = (work) => work(undefined);
const thread = values.thread === undefined ? {} : { thread: values.thread };
const result = await busy(() => app.execute(textStartOrFail(app), { text: inputText }, { ...thread, onStream }))
    .then((first) => untilDone(first, app, askWith(rl, (text) => stderr.write(text)), busy))
    .finally(async () => {
    rl.close();
    await app.close();
});
stdout.write(`\n`);
stderr.write(`${threadLine(result)}  (continue with --thread ${result.thread})\n`);
stderr.write(`config: ${app.name} | ${summaryLine(result)}\n`);
const memory = memoryLine(result);
if (memory !== undefined)
    stderr.write(`${memory}\n`);
stderr.write(`cost: ${costSummary(result.spend)}\n`);
costTrace(result.spend).forEach((line) => stderr.write(`  ${line}\n`));
stderr.write(`${costTotal(result.spend)}\n`);
