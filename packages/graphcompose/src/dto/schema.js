import { z } from "zod";
import { DtoValidationError, pathOf } from "./errors.js";
import { scalarSchemas } from "./formats.js";
import { isOpen, registerDto } from "./metadata.js";
const rules = new WeakMap();
/** Adds a cross-field rule to a DTO's validation (standard DTOs; checked after the fields). */
export function crossFieldRule(dto, rule) {
  // the rule reads the DTO's own fields, which validation has already checked
  const loose = rule;
  rules.set(dto, [...(rules.get(dto) ?? []), loose]);
}
const schemas = new WeakMap();
const elementSchema = (element) => {
  if (element === undefined) return z.unknown();
  return element.kind === "dto" ? objectSchemaOf(element.dto) : scalarSchemas[element.scalar]({});
};
function valueSchema(field) {
  const { settings } = field;
  switch (field.kind) {
    case "one-of":
      return z.enum(settings.values ?? []);
    case "nested":
      return elementSchema(field.element);
    case "list-of": {
      let list = z.array(elementSchema(field.element));
      if (settings.minItems !== undefined) list = list.min(settings.minItems);
      if (settings.maxItems !== undefined) list = list.max(settings.maxItems);
      return list;
    }
    default:
      return scalarSchemas[field.kind](settings);
  }
}
/** One field: its value, optional or defaulted, with what the model reads. */
function fieldSchema(field) {
  const { settings } = field;
  const value = valueSchema(field);
  const shaped = field.optional
    ? value.optional()
    : settings.default === undefined
      ? value
      : value.default(settings.default);
  const meta = {
    ...(settings.prompt === undefined ? {} : { description: settings.prompt }),
    ...(settings.example === undefined ? {} : { examples: [settings.example] }),
  };
  return Object.keys(meta).length === 0 ? shaped : shaped.meta(meta);
}
/** A DTO as an object schema (registered first: undecorated fields and behaviour fail here). */
export function objectSchemaOf(dto) {
  const cached = schemas.get(dto);
  if (cached !== undefined) return cached;
  if (isOpen(dto)) return z.record(z.string(), z.unknown());
  const fields = registerDto(dto);
  const own = rules.get(dto) ?? [];
  const schema = z
    .object(Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])))
    .superRefine((value, ctx) => {
      for (const rule of own) {
        const broken = rule(value);
        if (broken !== undefined) {
          ctx.addIssue({ code: "custom", path: [broken.field], message: broken.reason });
        }
      }
    });
  schemas.set(dto, schema);
  return schema;
}
/** The runtime check of a DTO (internal; zod stays inside the framework). */
export function schemaOf(dto) {
  // built from T's own decorators, so what it accepts is T
  return objectSchemaOf(dto);
}
export function inputJsonSchema(schema) {
  const json = z.toJSONSchema(schema, { io: "input" });
  delete json.$schema;
  return json;
}
/** The JSON Schema the model sees for a DTO: fields in declaration order, `description` = `prompt`. */
export const jsonSchemaOf = (dto) => inputJsonSchema(schemaOf(dto));
/** Checks raw data against a DTO: the parsed value, or every issue with its path and reason. */
export function validate(dto, raw) {
  const parsed = schemaOf(dto).safeParse(raw);
  if (parsed.success) return parsed.data;
  throw new DtoValidationError(
    dto.name,
    parsed.error.issues.map((issue) => ({ path: pathOf(issue.path), reason: issue.message })),
  );
}
