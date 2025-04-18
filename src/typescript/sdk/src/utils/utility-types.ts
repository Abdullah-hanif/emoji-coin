// cspell:word typeparam
/* eslint-disable import/no-unused-modules */

/**
 * A utility type that requires at least one of the properties.
 * @example
 * type Example = AtLeastOne<{ a: string; b: number }>; // { a: string } | { b: number }
 */
export type AtLeastOne<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]: T[P] } & Partial<Omit<T, K>>
  : never;

/**
 * A utility type that extracts the types of the values in an object `T`.
 * It creates a union type of all the property values of `T`.
 *
 * @typeparam T - The object type from which value types are extracted.
 *
 * Usage Example:
 * ```typescript
 * const ORDER_BY = {
 *   id: 'ASC',
 *   name: 'DESC',
 *   count: 100
 * };
 *
 * type OrderByValues = ValueOf<typeof ORDER_BY>; // 'ASC' | 'DESC' | 100
 * ```
 */
export type ValueOf<T> = Required<T>[keyof T];

export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type DeepWritable<T> = {
  -readonly [P in keyof T]: DeepWritable<T[P]>;
};

/**
 * This doesn't work on objects with multiple keys. For that, use {@link StrictXOR}.
 */
// prettier-ignore
export type XOR<T, U> =
  | (T & { [K in keyof U]?: never })
  | (U & { [K in keyof T]?: never }) ;

/**
 * A less ergonomic, but functional exclusive OR utility type. This function requires a specific
 * invocation to properly infer types. See the example below.
 *
 * @example
 * type ABorCD = StrictXOR<{ a: number, b: number }, { c: number, d: number }>;
 * function foo(value: ABorCD) {
 *   // `value.` won't autocomplete- it will show as having no fields. However, you can do this:
 *   if ("a" in value) {
 *     // TypeScript can properly infer from here
 *   } else {
 *     // And here
 *   }
 * }
 *
 */
export type StrictXOR<T, U> = Exclude<T, U> | Exclude<U, T>;

declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
export type Nominal<T, B> = T & Brand<B>;

/**
 * `{}` as a type technically means any non-nullish value.
 *
 * `Record<string, never>` is recommended for usage as an `any object` type.
 * @see {@link https://typescript-eslint.io/rules/no-empty-object-type}
 */
export type EmptyObject = Record<string, never>;
