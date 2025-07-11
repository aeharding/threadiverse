import createClient, { Middleware } from "openapi-fetch";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import { InvalidPayloadError, UnsupportedError } from "../../errors";
import { cleanThreadiverseParams } from "../../helpers";
import buildSafeClient from "../../SafeClient";
import { GetSiteResponse } from "../../types";
import * as compat from "./compat";
import { paths } from "./schema";

const mbinMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      const data = await response.json();
      if ("error" in data && typeof data.error === "string") {
        // This is how lemmy-js-client does it, mock that for now until
        // threadiverse supports error handling
        throw new Error(data.error);
      }

      throw new Error(`Bad request: ${response.status}`);
    }
  },
};

export class UnsafeMbinClient implements BaseClient {
  static mode = "mbin" as const;

  static softwareName = "mbin" as const;

  // Mbin versioning is not yet implemented
  static softwareVersionRange = "*";

  url: string;

  #client: ReturnType<typeof createClient<paths>>;

  constructor(url: string, options: BaseClientOptions) {
    this.url = url;

    this.#client = createClient({
      baseUrl: url,
      fetch: options.fetchFunction,
      // TODO
      headers: options.headers.Authorization
        ? {
            Authorization: options.headers.Authorization,
          }
        : undefined,
    });

    this.#client.use(mbinMiddleware);
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["banFromCommunity"]> {
    await this.#client.POST(
      `/api/admin/users/{user_id}/${payload.ban ? "ban" : "unban"}`,
      {
        ...options,
        params: {
          path: {
            user_id: payload.person_id,
          },
        },
      },
    );
  }

  async getFederatedInstances(
    options?: RequestOptions,
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.#client.GET("/api/federated", {
      ...options,
    });

    return {
      federated_instances: {
        allowed: [],
        blocked: [],
        linked: response.data!.instances.map((i) => ({
          domain: i.domain,
          software: i.software ?? undefined,
          version: i.version ?? undefined,
        })),
      },
    };
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPosts"]> {
    if (payload.mode && payload.mode !== "mbin")
      throw new InvalidPayloadError(
        `Connected to mbin, ${payload.mode} is not supported`,
      );

    if (payload.community_id || payload.community_name) {
      throw new UnsupportedError("getPosts with community_id is not supported");
    }

    const endpoint = (() => {
      if (payload.type_ === "Subscribed") {
        return "/api/entries/subscribed";
      }

      if (payload.type_ === "ModeratorView") {
        return "/api/entries/moderated";
      }

      return "/api/entries";
    })();

    if (typeof payload.page_cursor === "string") {
      throw new InvalidPayloadError("page_cursor must be number in mbin");
    }

    const response = await this.#client.GET(endpoint, {
      ...options,
      params: {
        query: {
          ...cleanThreadiverseParams(payload),
          federation: payload.type_ === "Local" ? "local" : "all",
          p: payload.page_cursor,
          perPage: payload.limit,
        },
      },
    });

    return {
      data: response.data!.items!.map((p) => compat.toPostView(this.url, p)),
      next_page: (response.data?.pagination?.currentPage ?? 0) + 1,
    };
  }

  async getSite(options?: RequestOptions): Promise<GetSiteResponse> {
    const response = await this.#client.GET("/api/instance", {
      ...options,
    });

    return {
      admins: [],
      site_view: {
        local_site: {
          captcha_enabled: false,
          comment_downvotes: "All",
          comment_upvotes: "All",
          post_downvotes:
            response.data!.downvotesMode === "enabled" ? "All" : "Disable",
          post_upvotes: "All",
          registration_mode: "Open",
          require_email_verification: false,
        },
        site: {
          actor_id: this.url,
          name: "todo",
        },
      },
      version: "0.0.0",
    };
  }
}

export default buildSafeClient(UnsafeMbinClient);
