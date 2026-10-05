export const stripFunctions = (obj: any): any => {
  if (typeof obj === "function") return "[Function]";
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (obj !== null && typeof obj === "object") {
    const next: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      next[k] = stripFunctions(v);
    }
    return next;
  }
  return obj;
};
