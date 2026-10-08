import { inspect } from "node:util";
/** The one line an interactive `gc` call ends with, on stderr. */
export const STAR_LINE = "⭐ Like GraphCompose? Star us on GitHub: https://github.com/PavelRavvich/graphcompose";
/** `GRAPHCOMPOSE_NO_STAR=1` turns the line off. */
export const NO_STAR_ENV = "GRAPHCOMPOSE_NO_STAR";
/** Flags that mean a machine or a script reads the output. */
const MACHINE_FLAGS = new Set(["--json", "--quiet"]);
const isSet = (value) => value !== undefined && value !== "";
/** True only for an interactive call: a terminal, no CI, no machine flags, not turned off. */
export function shouldShowStar(context) {
    return (context.isTTY === true &&
        !isSet(context.env.CI) &&
        context.env[NO_STAR_ENV] !== "1" &&
        !context.argv.some((arg) => MACHINE_FLAGS.has(arg)));
}
export function printStar(out) {
    out.write(`${STAR_LINE}\n`);
}
/** Runs a command, then the star line when due — also after a failure, whose error is written first. */
export async function runWithStar(command, context, out) {
    try {
        await command();
        return "completed";
    }
    catch (error) {
        out.write(`${inspect(error)}\n`); // as Node prints an uncaught error
        return "threw";
    }
    finally {
        if (shouldShowStar(context))
            printStar(out);
    }
}
