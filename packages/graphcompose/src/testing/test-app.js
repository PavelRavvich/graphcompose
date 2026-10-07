import { TestFailure } from "./errors.js";
import { agentSlice, routerSlice, toolSlice, } from "./slices.js";
/** Rethrows what the test must see: a reported failure wins over the run's own error. */
async function checked(environment, work) {
    let value;
    try {
        value = await work();
    }
    catch (error) {
        throw environment.book.takeFailure() ?? error;
    }
    const failure = environment.book.takeFailure();
    if (failure !== undefined)
        throw failure;
    return value;
}
export function createTestApp(environment) {
    let building;
    let closed = false;
    const built = () => {
        if (closed) {
            const message = "this app is closed — after restartApp() use the app it returned";
            return Promise.reject(new TestFailure("test.app-closed", message));
        }
        return (building ??= environment.newApp());
    };
    return {
        clock: environment.clock,
        execute: (start, input, options) => checked(environment, async () => (await built()).app.execute(start, input, options)),
        resume: (thread, decision, options) => checked(environment, async () => (await built()).app.resume(thread, decision, options)),
        close: async () => {
            closed = true;
            if (building !== undefined)
                await (await building).app.close();
        },
        agent: (agent) => ({
            answer: (task) => checked(environment, async () => agentSlice(await built(), agent).answer(task)),
        }),
        router: (router) => ({
            decide: (input) => checked(environment, async () => routerSlice(await built(), router).decide(input)),
        }),
        tool: (tool) => ({
            invoke: (input) => checked(environment, async () => toolSlice(await built(), tool).invoke(input)),
        }),
    };
}
