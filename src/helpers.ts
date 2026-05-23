/**
 * Drop fields that are part of threadiverse's public API but must not be sent
 * over the wire to any provider. Currently just `mode` (the discriminator on
 * mode-keyed sort types — purely a TS-level construct).
 */
export function cleanThreadiverseParams<P extends Record<string, unknown>>(
  payload: P,
): Omit<P, "mode"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mode, ...rest } = payload;
  return rest as Omit<P, "mode">;
}

export function toLowerCase<T extends string>(type: T): Lowercase<T> {
  return type.toLowerCase() as Lowercase<T>;
}
