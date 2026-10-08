import fs from "node:fs";
import path from "node:path";
import { callerFile } from "./call-site.js";
/** Reads a file relative to the caller's file. Returns a PromptInput function. */
export function file(filePath) {
    const caller = callerFile();
    if (!caller) {
        throw new Error(`file(): could not determine caller file for ${filePath}`);
    }
    const resolvedPath = path.resolve(path.dirname(caller), filePath);
    return async () => {
        return await fs.promises.readFile(resolvedPath, "utf-8");
    };
}
