export function cleanThreadiverseParams<P extends Record<string, unknown>>(
  payload: P,
): Omit<P, "mode"> {
  delete payload.mode;

  return payload;
}
