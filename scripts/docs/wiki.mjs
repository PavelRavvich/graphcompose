// The GitHub Wiki as docs (#240): a checkout of `<repo>.wiki.git` is checked like the repo's docs
// (`check-docs.mjs --wiki <dir>`) — its ts blocks compile, the scripts and commands it mentions
// exist — and its links between pages point to pages that exist.
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

/** Every page of a wiki checkout: its Markdown files, outside `.git`. */
export function wikiPages(dir) {
  if (!existsSync(dir)) throw new Error(`no wiki checkout at ${dir}`);
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => !path.split(/[\\/]/).includes(".git"))
    .sort();
}

// `[text](Target)` / `[text](Target#anchor)`: a link to another page of the wiki (no scheme, no path)
const PAGE_LINK = /\[[^\]]*\]\(([^)\s#:/]+)(#[^)\s]*)?\)/g;
const FENCE = /^\s*(`{3,}|~{3,})/;

/** The lines of `markdown` outside fenced blocks, with their 1-based numbers. */
function proseLines(markdown) {
  const lines = [];
  let fence;
  markdown.split("\n").forEach((line, index) => {
    const marker = FENCE.exec(line)?.[1];
    if (marker && fence === undefined) fence = marker;
    else if (marker && marker.startsWith(fence)) fence = undefined;
    else if (fence === undefined)
      lines.push({ line: index + 1, text: line.replace(/`[^`]*`/g, "") });
  });
  return lines;
}

/** Links of one page to wiki pages that do not exist, each as `doc:line: …`. */
export function wikiLinkProblems(doc, markdown, pages) {
  const names = new Set(pages.map((page) => basename(page, ".md")));
  const problems = [];
  for (const { line, text } of proseLines(markdown))
    for (const [, target] of text.matchAll(PAGE_LINK))
      if (!/\.\w+$/.test(target) && !names.has(target))
        problems.push(`${doc}:${String(line)}: the link to "${target}" names no wiki page`);
  return problems;
}
