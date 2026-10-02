/**
 * A prompt as it is sent (and fingerprinted): Unicode NFC, no BOM, no blank lines at the edges, no
 * trailing line breaks. Kept: indentation, spaces inside a line, tabs, blank lines between paragraphs.
 */
export function normalisePrompt(text: string): string {
  const lines = text.normalize("NFC").replaceAll("\uFEFF", "").split(/\r?\n/);
  const isBlank = (line: string): boolean => line.trim() === "";
  const first = lines.findIndex((line) => !isBlank(line));
  if (first === -1) return "";
  const last = lines.findLastIndex((line) => !isBlank(line));
  return lines.slice(first, last + 1).join("\n");
}

/** `promptUrls` parts: each normalised, joined with one blank line. */
export const joinPromptParts = (parts: readonly string[]): string =>
  parts
    .map(normalisePrompt)
    .filter((part) => part !== "")
    .join("\n\n");
