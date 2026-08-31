import { LemmyError } from "lemmy-js-client-v1";

/**
 * Turn non-success responses into the error the upstream client would
 * produce, before that client logs the complete request body to the console.
 * Besides credentials, those bodies can contain private messages and reports.
 */
export function errorSafeFetch(fetchFunction: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetchFunction(input, init);

    if (response.ok) return response;

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new LemmyError(response.statusText, response.status);
    }

    const error = field(body, "error") ?? response.statusText;
    const message = field(body, "message") ?? "";

    throw new LemmyError(error, response.status, message);
  };
}

function field(body: unknown, name: "error" | "message"): string | undefined {
  if (typeof body !== "object" || body === null || !(name in body)) return;

  const value = (body as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}
