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

/**
 * User-Agent and Capacitor's Android alias for it. The Android webview
 * strips `User-Agent` once headers enter a `Request` object
 * (https://issues.chromium.org/issues/40450316), so Capacitor apps send
 * `x-cap-user-agent` instead (converted back to `User-Agent` natively). It
 * only appears on native, where CORS doesn't apply.
 *
 * Forwarding the user agent matters: instances behind bot protection (e.g.
 * piefed.social's Cloudflare) challenge requests that arrive with a browser
 * User-Agent over a non-browser network stack.
 */
export const USER_AGENT_HEADERS = ["User-Agent", "x-cap-user-agent"];

/**
 * Pick `allowed` headers (case-insensitively) from `headers`. Used where
 * headers can't be forwarded wholesale — e.g. piefed's CORS policy only
 * allows `Content-Type, Authorization, Accept, User-Agent`, so forwarding
 * anything else (like `Cache-Control`) fails preflight in browsers.
 */
export function pickHeaders(
  headers: Record<string, string> | undefined,
  allowed: string[],
): Record<string, string> | undefined {
  if (!headers) return;

  const picked = Object.fromEntries(
    Object.entries(headers).filter(([key]) =>
      allowed.some((allow) => allow.toLowerCase() === key.toLowerCase()),
    ),
  );

  if (Object.keys(picked).length) return picked;
}
