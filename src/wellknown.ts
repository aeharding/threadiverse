import { z } from "zod/v4-mini";

import { BaseClientOptions } from "./BaseClient";
import { UnexpectedResponseError } from "./errors";

const NodeinfoLinksPayload = z.object({
  links: z.array(
    z.object({
      href: z.string(),
      rel: z.string(),
    }),
  ),
});

const Nodeinfo21Payload = z.object({
  software: z.object({
    name: z.string(),
    version: z.string(),
  }),
});

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

  const data = NodeinfoLinksPayload.parse(await response.json());

  const nodeinfoLink = resolveNodeinfoLink(data);

  if (!nodeinfoLink)
    throw new UnexpectedResponseError("No supported nodeinfo (2.x) found");

  const nodeinfoResponse = await fetch(nodeinfoLink, fetchOptions);

  const nodeinfoData = Nodeinfo21Payload.parse(await nodeinfoResponse.json());

  return nodeinfoData.software;
}

// {"links":[{"rel":"http://nodeinfo.diaspora.software/ns/schema/2.1","href":"https://lemmy.zip/nodeinfo/2.1"}]}
function resolveNodeinfoLink(
  data: z.infer<typeof NodeinfoLinksPayload>,
): string | undefined {
  return data.links.find((link) =>
    link.rel.match(
      /^http:\/\/nodeinfo\.diaspora\.software\/ns\/schema\/2\.\d+$/,
    ),
  )?.href;
}
