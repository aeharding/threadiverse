export function cleanThreadiverseParams<P extends Record<string, unknown>>(
  payload: P
): Omit<P, "mode"> {
  delete payload.mode;

  return payload;
}

export function toLowerCase<T extends string>(type: T): Lowercase<T> {
  return type.toLowerCase() as Lowercase<T>;
}
