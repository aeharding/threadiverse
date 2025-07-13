import createClient, { Middleware } from "openapi-fetch";
import * as oauthClient from "openid-client";

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
import { buildMbinAuthMiddleware, MBIN_SCOPES } from "./oauth";
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

  #options: BaseClientOptions;

  constructor(url: string, options: BaseClientOptions) {
    this.url = url;
    this.#options = options;

    this.#client = createClient({
      baseUrl: url,
      fetch: options.fetchFunction,
    });

    this.#client.use(mbinMiddleware);

    if (options.oauth) {
      this.#client.use(
        buildMbinAuthMiddleware({
          ...options.oauth,
          getOauthConfig: () => this.#getOauthConfig(),
        }),
      );
    }
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

    console.log("fetching posts", endpoint);

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
      next_page:
        response.data!.pagination?.maxPage !==
        response.data?.pagination?.currentPage
          ? (response.data?.pagination?.currentPage ?? 0) + 1
          : undefined,
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

  async logout() {
    // TODO: Does mbin support logout?
    return;
  }

  async oauthLogin(
    payload: Parameters<BaseClient["oauthLogin"]>[0],
  ): ReturnType<BaseClient["oauthLogin"]> {
    // mbin doesn't support well-known oauth discovery endpoint
    const serverMetadata: oauthClient.ServerMetadata = {
      authorization_endpoint: `${this.url}/authorize`,
      code_challenge_methods_supported: ["S256"],
      issuer: this.url,
      token_endpoint: `${this.url}/token`,
    };

    const oauthConfig = new oauthClient.Configuration(
      serverMetadata,
      payload.clientId,
    );

    oauthConfig[oauthClient.customFetch] = this.#options.fetchFunction;

    /**
     * PKCE: The following MUST be generated for every redirect to the
     * authorization_endpoint. You must store the code_verifier and state in the
     * end-user session such that it can be recovered as the user gets redirected
     * from the authorization server back to your application.
     */
    const code_verifier: string = oauthClient.randomPKCECodeVerifier();
    const code_challenge: string = await oauthClient.calculatePKCECodeChallenge(
      code_verifier,
    );

    if (!oauthConfig.serverMetadata().supportsPKCE())
      throw new Error("PKCE not supported");

    return {
      codeVerifier: code_verifier,
      redirectTo: oauthClient.buildAuthorizationUrl(oauthConfig, {
        code_challenge,
        code_challenge_method: "S256",
        redirect_uri: payload.redirectUri,
        scope: (payload.scopes ?? MBIN_SCOPES).join(" "),
      }),
    };
  }

  async onOauthCallback(
    payload: Parameters<BaseClient["onOauthCallback"]>[0],
  ): ReturnType<BaseClient["onOauthCallback"]> {
    const response = await oauthClient.authorizationCodeGrant(
      await this.#getOauthConfig(),
      new URL(payload.uri),
      {
        pkceCodeVerifier: payload.codeVerifier,
      },
    );

    this.#options.oauth?.setTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token!,
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token!,
    };
  }

  async registerClient(
    payload: Parameters<BaseClient["registerClient"]>[0],
  ): ReturnType<BaseClient["registerClient"]> {
    const response = await this.#client.POST("/api/client", {
      body: {
        contactEmail: payload.contactEmail,
        grants: ["authorization_code", "refresh_token"],
        name: payload.name,
        public: true,
        redirectUris: payload.redirectUris,
        // @ts-expect-error - TODO: fix this
        scopes: payload.scopes ?? MBIN_SCOPES,
      },
    });

    return response.data!;
  }

  async #getOauthConfig() {
    // Reconstruct the OAuth configuration
    const serverMetadata: oauthClient.ServerMetadata = {
      authorization_endpoint: `${this.url}/authorize`,
      code_challenge_methods_supported: ["S256"],
      issuer: this.url,
      token_endpoint: `${this.url}/token`,
    };

    const oauthConfig = new oauthClient.Configuration(
      serverMetadata,
      await this.#options.getClientId(),
    );

    oauthConfig[oauthClient.customFetch] = this.#options.fetchFunction;

    return oauthConfig;
  }
}

export default buildSafeClient(UnsafeMbinClient);
