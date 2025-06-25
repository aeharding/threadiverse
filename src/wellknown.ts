import { BaseClientOptions } from "./BaseClient";

export interface Nodeinfo21Payload {
  software: {
    name: string;
    version: string;
  };
}

interface NodeinfoLink {
  href: string;
  rel: string;
}

interface NodeinfoLinksPayload {
  links: NodeinfoLink[];
}

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

  const data = await response.json();

  const nodeinfoLink = resolveNodeinfoLink(data);

  if (nodeinfoLink) {
    const nodeinfoResponse = await fetch(nodeinfoLink, fetchOptions);

    const nodeinfoData = (await nodeinfoResponse.json()) as Nodeinfo21Payload;

    return nodeinfoData.software;
  }

  throw new Error(
    "No supported nodeinfo (http://nodeinfo.diaspora.software/ns/schema/2.1) found",
  );
}

// {"links":[{"rel":"http://nodeinfo.diaspora.software/ns/schema/2.1","href":"https://lemmy.zip/nodeinfo/2.1"}]}
function resolveNodeinfoLink(data: NodeinfoLinksPayload): string | undefined {
  return data.links.find(
    (link) => link.rel === "http://nodeinfo.diaspora.software/ns/schema/2.1",
  )?.href;
}
