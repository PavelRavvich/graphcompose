import "dotenv/config";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs, styleText } from "node:util";
import { createApp } from "./app/create-app.js";
import { loadWorkflowClass, loadEnvironment } from "./cli/load-workflow.js";
import { memoryLine, summaryLine, threadLine, untilDone } from "./cli/approve.js";
import { costSummary, costTotal, costTrace } from "./cli/finops.js";
import { askWith } from "./cli/ask.js";
import { onInterruptKey } from "./cli/keys.js";
import { askMessage } from "./cli/multiline.js";
import { withSpinner } from "./cli/spinner.js";
import { textStartOrFail } from "./cli/text-start.js";
// graphcompose chat --workflow <path> [--thread <id>] [--profile <p>]
const { values } = parseArgs({
    options: {
        workflow: { type: "string", default: "./src/workflow.ts" },
        profile: { type: "string" },
        thread: { type: "string" },
        env: { type: "string" },
    },
});
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const env = await loadEnvironment(values.workflow, values.env);
const app = await createApp(await loadWorkflowClass(values.workflow), {
    profile: values.profile,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    env,
});
const start = textStartOrFail(app);
app.models.forEach((line) => {
    stdout.write(`${styleText("dim", `model ${line}`)}\n`);
});
app.warnings.forEach((warning) => {
    stdout.write(`warning: ${warning}\n`);
});
const rl = createInterface({ input: stdin, terminal: false });
const ask = askWith(rl, (text) => stdout.write(text));
const say = (text) => {
    stdout.write(`${text}\n`);
};
let threadId = values.thread;
const turn = { interrupted: false };
/** A turn: loader, and Esc / Ctrl+C abort it through its signal. */
const busy = async (work) => {
    const controller = new AbortController();
    const stopKeys = onInterruptKey(stdin, () => {
        turn.interrupted = true;
        controller.abort();
    });
    try {
        return await withSpinner(stdout, "thinking · esc to interrupt", () => work(controller.signal));
    }
    finally {
        stopKeys();
    }
};
say(styleText("dim", `Chat with "${app.name}"${values.profile === undefined ? "" : ` (profile ${values.profile})`} ${app.version}. /new — new conversation, /exit — quit, \\ + Enter — new line, Esc — interrupt.`));
try {
    for (;;) {
        const line = (await askMessage(ask, styleText("bold", "you › "), styleText("dim", "  … ")))?.trim();
        if (line === undefined || line === "/exit")
            break;
        if (line === "")
            continue;
        if (line === "/new") {
            threadId = undefined;
            say(styleText("dim", "— new conversation —"));
            continue;
        }
        try {
            const thread = threadId === undefined ? {} : { thread: threadId };
            turn.interrupted = false;
            const first = await busy((signal) => app.execute(start, { text: line }, { ...thread, signal }));
            const result = await untilDone(first, app, ask, busy);
            threadId = result.thread;
            say(`${styleText("cyan", "agent ›")} ${result.answer}`);
            say(styleText("dim", `  ${threadLine(result)}`));
            say(styleText("dim", `  ${summaryLine(result)}`));
            const memory = memoryLine(result);
            if (memory !== undefined)
                say(styleText("dim", `  ${memory}`));
            say(styleText("dim", `  ${costSummary(result.spend)}`));
            costTrace(result.spend).forEach((line) => {
                say(styleText("dim", `    ${line}`));
            });
            say(styleText("bold", `  ${costTotal(result.spend)}`));
        }
        catch (error) {
            if (turn.interrupted)
                say(styleText("yellow", "interrupted"));
            else
                say(styleText("red", `error › ${error instanceof Error ? error.message : String(error)}`));
        }
    }
}
finally {
    rl.close();
    await app.close();
}
