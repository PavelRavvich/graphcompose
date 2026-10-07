/** A DTO class that cannot be used: the code says why, the message names the class and fields. */
export class DtoError extends Error {
    code;
    name = "DtoError";
    constructor(code, message) {
        super(`${code}: ${message}`);
        this.code = code;
    }
}
/** Data that does not fit a DTO: every issue with its field path and reason. */
export class DtoValidationError extends Error {
    dto;
    issues;
    name = "DtoValidationError";
    constructor(dto, issues) {
        super(`invalid ${dto}: ${issues.map((i) => `${i.path}: ${i.reason}`).join("; ")}`);
        this.dto = dto;
        this.issues = issues;
    }
}
/** A zod issue path as people write it: `jobs[2].url`, `(root)` for the whole value. */
export function pathOf(path) {
    const text = path
        .map((key) => (typeof key === "number" ? `[${String(key)}]` : `.${String(key)}`))
        .join("")
        .replace(/^\./, "");
    return text === "" ? "(root)" : text;
}
