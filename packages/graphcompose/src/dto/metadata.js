import { METADATA_KEY } from "../polyfills/symbol-metadata.js";
import { DtoError } from "./errors.js";
/** Each class's own fields (in declaration order), keyed by its decorator metadata object. */
const tables = new WeakMap();
function ownTable(metadata) {
  const existing = tables.get(metadata);
  if (existing !== undefined) return existing;
  const table = new Map();
  tables.set(metadata, table);
  return table;
}
/** Called by every field decorator at class definition. */
export function recordField(metadata, spec) {
  if (metadata === undefined) {
    throw new DtoError(
      "dto.no-metadata",
      `field "${spec.name}": decorator metadata is missing — import "graphcompose/dto" before declaring DTOs`,
    );
  }
  ownTable(metadata).set(spec.name, spec);
}
const isObject = (value) => typeof value === "object" && value !== null;
/** A DTO's fields — its parents' first, then its own — in declaration order. */
export function fieldsOf(dto) {
  const chain = [];
  let metadata = Reflect.get(dto, METADATA_KEY);
  while (isObject(metadata)) {
    const own = tables.get(metadata);
    if (own !== undefined) chain.unshift(own);
    metadata = Object.getPrototypeOf(metadata);
  }
  return chain.flatMap((table) => [...table.values()]);
}
/** DTOs that hold any JSON object (internal: tool arguments). */
const openDtos = new WeakSet();
export const markOpen = (dto) => {
  openDtos.add(dto);
};
export const isOpen = (dto) => openDtos.has(dto);
/** Methods and accessors anywhere up the prototype chain (a DTO has none). */
function behaviourOf(dto) {
  const names = [];
  for (let proto = dto.prototype; isObject(proto) && proto !== Object.prototype;) {
    names.push(...Object.getOwnPropertyNames(proto).filter((name) => name !== "constructor"));
    proto = Object.getPrototypeOf(proto);
  }
  return names;
}
const registered = new WeakSet();
/**
 * The startup check of a DTO class (once per class): every own field is decorated, and the class is
 * plain data — no methods, accessors or `#private` fields. Needs `useDefineForClassFields` (ES2022+).
 */
export function registerDto(dto) {
  const fields = fieldsOf(dto);
  if (registered.has(dto)) return fields;
  const decorated = new Set(fields.map((field) => field.name));
  const instance = Reflect.construct(dto, []);
  const undecorated = Object.keys(isObject(instance) ? instance : {}).filter(
    (key) => !decorated.has(key),
  );
  if (undecorated.length > 0) {
    throw new DtoError(
      "dto.undecorated-field",
      `${dto.name}: every field needs a field decorator — ${undecorated.join(", ")}`,
    );
  }
  const notPlain = [
    ...behaviourOf(dto),
    ...fields.filter((field) => field.isPrivate).map((field) => field.name),
  ];
  if (notPlain.length > 0) {
    throw new DtoError(
      "dto.not-plain-data",
      `${dto.name}: a DTO is plain data, without methods or private fields — ${notPlain.join(", ")}`,
    );
  }
  registered.add(dto);
  return fields;
}
