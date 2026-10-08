import { recordField } from "./metadata.js";
/** The decorator that records one field; `(initial) => initial` leaves the value alone. */
function field(kind, settings, element) {
    return (_value, context) => {
        recordField(context.metadata, {
            name: String(context.name),
            kind,
            optional: "optional" in settings && settings.optional === true,
            settings,
            ...(element === undefined ? {} : { element }),
            isPrivate: context.private,
        });
        return (initial) => initial;
    };
}
/** Factories of plain values, so `@ListOf(Text)` knows what its elements are. */
const scalarFactories = new WeakMap();
function scalar(kind) {
    const factory = (options = {}) => field(kind, options);
    scalarFactories.set(factory, kind);
    // one implementation behind both call signatures: `optional` only changes the field's type
    return factory;
}
/** Text; own formats with `pattern` (say the format in `prompt` too). */
export const Text = scalar("text");
/** A whole number. */
export const Integer = scalar("integer");
/** A finite number. */
export const Decimal = scalar("decimal");
/** true / false. */
export const Flag = scalar("flag");
export const Email = scalar("email");
export const Url = scalar("url");
export const Uuid = scalar("uuid");
/** An ISO 8601 calendar date: `2026-10-01`. */
const DateField = scalar("date");
export { DateField as Date };
/** An ISO 8601 date-time with an offset or `Z`: `2026-10-01T09:00:00+03:00`. */
export const DateTime = scalar("date-time");
/** An ISO 8601 duration: `PT30M`. */
export const Duration = scalar("duration");
/** A decimal number as a string, exact: `"19.99"`; at most `scale` digits after the point. */
export const DecimalString = scalar("decimal-string");
/** An ISO 4217 currency code: `"USD"`. */
export const CurrencyCode = scalar("currency-code");
/** An ISO 3166-1 alpha-2 country code: `"IL"`. */
export const CountryCode = scalar("country-code");
/** A phone number in E.164: `"+972521234567"`. */
export const PhoneNumber = scalar("phone-number");
/** A media (MIME) type `type/subtype`: `"application/pdf"`. */
export const MediaType = scalar("media-type");
/** An IANA time zone: `"Asia/Jerusalem"`. */
export const TimeZone = scalar("time-zone");
export function OneOf(options) {
    return field("one-of", options);
}
/** A list item is a plain-value factory (registered by `scalar`) or else a DTO class. */
const elementOf = (item) => {
    const kind = scalarFactories.get(item);
    // the overloads admit only factories and DTO classes, so anything unregistered is a DTO class
    return kind === undefined
        ? { kind: "dto", dto: item }
        : { kind: "scalar", scalar: kind };
};
const listOf = (item, options = {}) => field("list-of", options, elementOf(item));
/** A list of DTOs (`@ListOf(Job)`) or of plain values (`@ListOf(Text)`). */
// one implementation behind both call signatures: `optional` only changes the field's type
export const ListOf = listOf;
export function Nested(dto, options = {}) {
    return field("nested", options, { kind: "dto", dto });
}
