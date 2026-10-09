import { ScaffoldError } from "./errors.js";
const words = (raw) =>
  raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word !== "")
    .map((word) => word.toLowerCase());
const capital = (word) => word.charAt(0).toUpperCase() + word.slice(1);
/** `"Search Orders"`, `searchOrders`, `search-orders` → one `Names`; letters first, letters and digits only. */
export function namesOf(raw) {
  const parts = words(raw);
  const [first] = parts;
  if (first === undefined || !/^[a-z]/.test(first)) {
    throw new ScaffoldError(
      `"${raw}" is not a valid name: start with a letter, use letters and digits`,
    );
  }
  return {
    kebab: parts.join("-"),
    snake: parts.join("_"),
    pascal: parts.map(capital).join(""),
    title: capital(parts.join(" ")),
  };
}
