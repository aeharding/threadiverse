import { z } from "zod/v4-mini";

import { BaseClientOptions } from "./BaseClient";
import { UnexpectedResponseError } from "./errors";

export const NodeinfoLink = z.object({
  href: z.string(),
  rel: z.string(),
});

// Entries are validated individually in resolveNodeinfoLink so that one
// malformed vendor link doesn't break discovery for the whole instance
export const NodeinfoLinksPayload = z.object({
  links: z.array(z.unknown()),
});

export const Nodeinfo21Payload = z.object({
  software: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

/**
 * Cache of software discovery results, keyed by hostname. See
 * `ThreadiverseClientOptions.discoveryCache`.
 */
export type DiscoveryCache = Map<
  string,
  Promise<Nodeinfo21Payload["software"]>
>;

export type Nodeinfo21Payload = z.infer<typeof Nodeinfo21Payload>;

export async function resolveSoftware(
  url: string,
  options?: BaseClientOptions,
): Promise<Nodeinfo21Payload["software"]> {
  const fetch = options?.fetchFunction ?? globalThis.fetch;

  const fetchOptions: RequestInit = {
    headers: {
      // ...options?.headers, // TODO: Piefed doesn't allow many headers for CORS
      Accept: "application/json",
    },
  };

  const response = await fetch(`${url}/.well-known/nodeinfo`, fetchOptions);

  const data = parseDiscoveryPayload(
    NodeinfoLinksPayload,
    await response.json(),
    "nodeinfo links",
  );

  const nodeinfoLink = resolveNodeinfoLink(data);

  if (!nodeinfoLink)
    throw new UnexpectedResponseError("No supported nodeinfo (2.x) found");

  const nodeinfoResponse = await fetch(nodeinfoLink, fetchOptions);

  const nodeinfoData = parseDiscoveryPayload(
    Nodeinfo21Payload,
    await nodeinfoResponse.json(),
    "nodeinfo",
  );

  return nodeinfoData.software;
}

/**
 * Discovery is the "is this even a supported fediverse instance?" boundary,
 * so malformed payloads surface as the library's error taxonomy (with the
 * ZodError as `cause`) instead of leaking raw validation errors.
 */
function parseDiscoveryPayload<Schema extends z.ZodMiniType>(
  schema: Schema,
  data: unknown,
  what: string,
): z.infer<Schema> {
  const result = schema.safeParse(data);

  if (!result.success)
    throw new UnexpectedResponseError(`Malformed ${what} response`, {
      cause: result.error,
    });

  return result.data as z.infer<Schema>;
}

// {"links":[{"rel":"http://nodeinfo.diaspora.software/ns/schema/2.1","href":"https://lemmy.zip/nodeinfo/2.1"}]}
function resolveNodeinfoLink(
  data: z.infer<typeof NodeinfoLinksPayload>,
): string | undefined {
  for (const rawLink of data.links) {
    const link = NodeinfoLink.safeParse(rawLink);

    if (!link.success) continue;

    if (
      link.data.rel.match(
        /^http:\/\/nodeinfo\.diaspora\.software\/ns\/schema\/2\.\d+$/,
      )
    )
      return link.data.href;
  }
}
