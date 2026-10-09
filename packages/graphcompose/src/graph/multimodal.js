/** Converts a string or array of blocks into an array of blocks. */
export function toBlocks(content) {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return content;
}
/** Merges multiple message contents into a single MessageContent. */
export function mergeContent(...parts) {
  const valid = parts.filter((p) => p !== undefined && p !== "");
  if (valid.length === 0) return "";
  if (valid.every((p) => typeof p === "string")) {
    return valid.join("");
  }
  const blocks = [];
  for (const part of valid) {
    if (typeof part === "string") {
      if (part.length > 0) {
        blocks.push({ type: "text", text: part });
      }
    } else {
      blocks.push(...part);
    }
  }
  return blocks;
}
/** Extracts all text from a multimodal content, ignoring images. */
export function extractText(content) {
  if (typeof content === "string") return content;
  return content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
