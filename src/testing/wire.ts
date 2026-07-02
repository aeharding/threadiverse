/**
 * Wire-accurate variant of an API type.
 *
 * The upstream TS types declare absent values as optional properties, but
 * real servers serialize many of them as JSON `null`. Test fixtures need to
 * exercise that (it has caused real bugs — e.g. `null` votes parsed as
 * downvotes), so `Wire<T>` additionally permits `null` wherever a property
 * is optional.
 */
export type Wire<T> = T extends (infer U)[]
  ? Wire<U>[]
  : T extends object
    ? {
        [K in keyof T]: (undefined extends T[K] ? null : never) | Wire<T[K]>;
      }
    : T;
