/* eslint-disable @typescript-eslint/no-explicit-any */
import Big from "big.js";
import parse from "json-bigint";

import type { AnyColumnName } from "./types/json-types";
import {
  bigintColumns,
  floatColumns,
  integerColumns,
  timestampColumns,
} from "./types/postgres-numeric-types";

const JSON_BIGINT = parse({
  alwaysParseAsBig: false,
  useNativeBigInt: true,
  storeAsString: true,
  protoAction: "ignore",
  constructorAction: "ignore",
});

/**
 * In case a field doesn't match up with its proper parsing function, fall back to not using a
 * reviver parse function at all, and simply return the data as is.
 */
const tryWithFallbackParse = (parser: (v: any) => any) => (v: any) => {
  try {
    return parser(v);
  } catch {
    // Log an error on the server.
    console.error(`Failed to parse value: ${v}`);
    return v;
  }
};
const parseFloat = (v: any) => Big(v).toString();
const parseBigInt = (v: any) => BigInt(v);
const parseInteger = (v: any) => Number(v);
// Ensure the Zulu/UTC indicator is there, since it's stored as a timestamp with no timezone
// although it definitely has one. Don't convert to `Date`, because it loses some microsecond
// precision, although it's totally possible to call new Date(...) and have it work as expected.
const parseTimestamp = (v: any) => `${v}Z`;
const parseDefault = (v: any) => v;
const floatConversions = [...Array.from(floatColumns).map((c) => [c, parseFloat] as const)];
const bigintConversions = [...Array.from(bigintColumns).map((c) => [c, parseBigInt] as const)];
const integerConversions = [...Array.from(integerColumns).map((c) => [c, parseInteger] as const)];
const timestampConversions = [
  ...Array.from(timestampColumns).map((c) => [c, parseTimestamp] as const),
];

const converter = new Map<AnyColumnName, (value: any) => any>([
  ...floatConversions,
  ...bigintConversions,
  ...integerConversions,
  ...timestampConversions,
]);

/**
 * Parses a JSON string that uses bigints- i.e., numbers too large for a normal number, but not used
 * as strings. Without this parsing method, the parsed value loses precision or results in an error.
 *
 * THe parsing functions are designated by the column field name, which means there shouldn't ever
 * be overlapping column names with different types in the database, otherwise the parsing function
 * may fail.
 *
 * In case this does happen though, there is a fallback function to try to parse the value without
 * any assumptions about how to parse it.
 *
 * @see {@link tryWithFallbackParse}
 */
export const parseJSONWithBigInts = <T>(msg: string): T => {
  return JSON_BIGINT.parse(msg, (key, value) => {
    try {
      const fn = converter.get(key as AnyColumnName) ?? parseDefault;
      // Curry the retrieved parsing function to add a fallback parsing function.
      const fnWithFallback = tryWithFallbackParse(fn);
      return fnWithFallback(value);
    } catch {
      console.error(`Failed to parse ${key}: ${value} as a ${converter.get(key as AnyColumnName)}`);
    }
  });
};

export const stringifyJSONWithBigInts = (
  msg: any,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number
): string => JSON_BIGINT.stringify(msg, replacer, space);
