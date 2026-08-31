import createClient, { Middleware } from "openapi-fetch";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  BotChallengeError,
  createResponseError,
  detectBotChallenge,
  InvalidPayloadError,
  UnexpectedResponseError,
  UnsupportedError,
} from "../../errors";
import { pickHeaders, USER_AGENT_HEADERS } from "../../helpers";
import buildSafeClient from "../../SafeClient";
import { PiefedErrorResponse } from "../../schemas";
import * as types from "../../types";
import {
  ListPersonContent,
  ListPersonContentResponse,
  PostView,
} from "../../types";
import { getPostCommentItemCreatedDate } from "../lemmyv0/helpers";
import * as compat from "./compat";
import { components, paths } from "./schema";

async function validateResponse(response: Response) {
  if (response.ok) {
    // Bot challenges (e.g. Anubis) can interject HTML with a 2xx status.
    // Clone so the caller can still consume the body.
    if (response.headers.get("content-type")?.includes("text/html")) {
      const body = await response.clone().text();
      const vendor = detectBotChallenge(response, body);
      if (vendor) throw new BotChallengeError(vendor);
    }
    return;
  }

  const headerVendor = detectBotChallenge(response);
  if (headerVendor) throw new BotChallengeError(headerVendor);

  let code = response.statusText;
  let payload: types.PiefedErrorResponse | undefined;
  const body = await response.text();
  try {
    const data: unknown = JSON.parse(body);
    const parsed = PiefedErrorResponse.safeParse(data);
    if (parsed.success) {
      payload = parsed.data;
      code = parsed.data.message;
    } else if (data && typeof data === "object") {
      // Current PieFed's generated DefaultError is `{ message?: string }`;
      // older instances have also emitted `{ error: string }`.
      if ("error" in data && typeof data.error === "string") {
        code = data.error;
      } else if ("message" in data && typeof data.message === "string") {
        code = data.message;
      }
    }
  } catch {
    // Non-JSON body (e.g., HTML error page from an upstream proxy).
    // Fall back to statusText already set above.
    const vendor = detectBotChallenge(response, body);
    if (vendor) throw new BotChallengeError(vendor);
  }
  throw createResponseError(code, {
    response: payload,
    software: "piefed",
    status: response.status,
  });
}

const piefedMiddleware: Middleware = {
  async onResponse({ response }) {
    await validateResponse(response);
  },
};

interface ModlogCursorFilters {
  comment_id: number | undefined;
  community_id: number | undefined;
  mod_person_id: number | undefined;
  other_person_id: number | undefined;
  post_id: number | undefined;
}

interface ModlogCursorState {
  batchSize: number;
  filters: ModlogCursorFilters;
  sources: Record<PiefedModlogBucket, ModlogSourceCursor | null>;
}

interface ModlogSourceCursor {
  offset: number;
  page: number;
}

type PiefedCommentListPayload = types.PageParams & {
  mode?: "piefed";
  person_id?: number;
  sort?: NonNullable<
    paths["/api/alpha/comment/list"]["get"]["parameters"]["query"]
  >["sort"];
};

type PiefedCommentReportView = components["schemas"]["CommentReportView"];

type PiefedModlogBucket = keyof PiefedModlogResponse;

type PiefedModlogResponse = components["schemas"]["GetModLogResponse"];

type PiefedPostListPayload = types.PageParams & {
  mode?: "piefed";
  person_id?: number;
  sort?: NonNullable<
    paths["/api/alpha/post/list"]["get"]["parameters"]["query"]
  >["sort"];
};

type PiefedPostReportView = components["schemas"]["PostReportView"];

interface ReportCursorState {
  batchSize: number;
  comment: null | ReportSourceCursor;
  communityId: number | undefined;
  nextKind: ReportKind;
  post: null | ReportSourceCursor;
  unresolvedOnly: boolean | undefined;
}

type ReportKind = "comment" | "post";

interface ReportPageBuffer<T> {
  cursor: null | ReportSourceCursor;
  items: T[];
  loaded: boolean;
  nextPage: number | undefined;
}

interface ReportSourceCursor {
  offset: number;
  page: number;
}

/** Canonical search types PieFed can actually serve (its enum has no "All") */
type SearchableType = Exclude<types.SearchType, "all">;

interface SerializedModlogCursor {
  b: number;
  f: [
    null | number,
    null | number,
    null | number,
    null | number,
    null | number,
  ];
  s: ([number, number] | null)[];
}

interface SerializedReportCursor {
  b: number;
  c: [number, number] | null;
  ci: null | number;
  n: "c" | "p";
  p: [number, number] | null;
  u: boolean | null;
}

/**
 * PieFed counts `max_depth` from *below* top-level, Lemmy counts from the
 * post, so the same request reaches a level deeper on PieFed — verified
 * live: with `max_depth=1` and no `parent_id`, Lemmy returns top-level
 * comments while PieFed returns those plus their children. Requesting one
 * less keeps the canonical meaning ("levels of comments to return")
 * identical on both. With a `parent_id` the two agree, so it passes
 * through untouched.
 *
 * Requests for zero levels never reach here (getComments answers those
 * directly), so the adjusted value can't go negative — and wire `0`
 * unambiguously means canonical `1`, which is what lets the fake's decoder
 * invert this.
 */
function toPiefedMaxDepth(
  payload: Parameters<BaseClient["getComments"]>[0],
): number | undefined {
  const { max_depth, parent_id } = payload;

  if (max_depth === undefined || parent_id !== undefined) return max_depth;

  return max_depth - 1;
}

const PIEFED_SEARCH_TYPE = {
  comments: "Comments",
  communities: "Communities",
  posts: "Posts",
  users: "Users",
} as const satisfies Record<
  SearchableType,
  NonNullable<paths["/api/alpha/search"]["get"]["parameters"]["query"]>["type_"]
>;

const DEFAULT_MODLOG_PAGE_SIZE = 10;
const DEFAULT_REASON = "None";
const DEFAULT_REPORT_PAGE_SIZE = 20;
const MAX_MODLOG_BATCH_SIZE = 50;
const MODLOG_BUCKET_INDEX = Object.freeze({
  added: 0,
  added_to_community: 1,
  admin_purged_comments: 2,
  admin_purged_communities: 3,
  admin_purged_persons: 4,
  admin_purged_posts: 5,
  banned: 6,
  banned_from_community: 7,
  featured_posts: 8,
  hidden_communities: 9,
  locked_posts: 10,
  removed_comments: 11,
  removed_communities: 12,
  removed_posts: 13,
  transferred_to_community: 14,
} satisfies Record<PiefedModlogBucket, number>);
const MODLOG_BUCKETS = Object.freeze(
  Object.keys(MODLOG_BUCKET_INDEX) as PiefedModlogBucket[],
);
const MODLOG_CURSOR_PREFIX = "piefed-modlog:v1:";
const REPORT_CURSOR_PREFIX = "piefed-reports:v1:";

export class UnsafePiefedClient implements BaseClient {
  static mode = "piefed" as const;

  static softwareName = "piefed" as const;

  // Piefed is not versioned atm
  static softwareVersionRange = "*";

  #client: ReturnType<typeof createClient<paths>>;
  #currentPersonIdPromise: Promise<number> | undefined;
  #customFetch: typeof fetch;
  #headers: Record<string, string> | undefined;
  #url: string;

  constructor(url: string, options: BaseClientOptions) {
    this.#customFetch = options.fetchFunction ?? globalThis.fetch;
    this.#url = url;

    // Piefed's CORS policy only allows `Content-Type, Authorization, Accept,
    // User-Agent` — forwarding anything else (e.g. `Cache-Control`) fails
    // preflight in browsers.
    const headers = pickHeaders(options.headers, [
      "Authorization",
      ...USER_AGENT_HEADERS,
    ]);

    this.#headers = headers;

    this.#client = createClient({
      baseUrl: url,
      fetch: options.fetchFunction,
      headers,
    });

    this.#client.use(piefedMiddleware);
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["banFromCommunity"]> {
    if (payload.remove_or_restore_data)
      throw new InvalidPayloadError(
        "PieFed cannot remove or restore a person's community content while changing a ban",
      );

    if (!payload.ban) {
      await this.#client.PUT("/api/alpha/community/moderate/unban", {
        ...options,
        body: {
          community_id: payload.community_id,
          user_id: payload.person_id,
        },
      });
      return;
    }

    const expiresAt =
      payload.expires_at === undefined
        ? undefined
        : new Date(payload.expires_at * 1_000).toISOString();

    await this.#client.POST("/api/alpha/community/moderate/ban", {
      ...options,
      body: {
        community_id: payload.community_id,
        expires_at: expiresAt,
        permanent: expiresAt === undefined,
        reason: payload.reason ?? DEFAULT_REASON,
        user_id: payload.person_id,
      },
    });
  }

  async blockCommunity(
    payload: Parameters<BaseClient["blockCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockCommunity"]> {
    const response = await this.#client.POST("/api/alpha/community/block", {
      ...options,
      body: { ...payload },
    });

    return {
      community_view: compat.toCommunityView(response.data!.community_view),
    };
  }

  async blockInstance(
    payload: Parameters<BaseClient["blockInstance"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockInstance"]> {
    await this.#client.POST("/api/alpha/site/block", {
      ...options,
      body: { ...payload },
    });
  }

  async blockPerson(
    payload: Parameters<BaseClient["blockPerson"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockPerson"]> {
    const response = await this.#client.POST("/api/alpha/user/block", {
      ...options,
      body: { ...payload },
    });

    return {
      ...response.data!,
      person_view: compat.toPersonView(response.data!.person_view),
    };
  }

  async createComment(
    payload: Parameters<BaseClient["createComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createComment"]> {
    const response = await this.#client.POST("/api/alpha/comment", {
      ...options,
      body: {
        ...payload,
        body: payload.content,
      },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async createCommentReport(
    payload: Parameters<BaseClient["createCommentReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createCommentReport"]> {
    await this.#client.POST("/api/alpha/comment/report", {
      ...options,
      body: { ...payload, report_remote: true },
    });
  }

  async createPost(
    payload: Parameters<BaseClient["createPost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.POST("/api/alpha/post", {
      ...options,
      body: {
        ...payload,
        title: payload.name,
      },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async createPostReport(
    payload: Parameters<BaseClient["createPostReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createPostReport"]> {
    await this.#client.POST("/api/alpha/post/report", {
      ...options,
      body: { ...payload, report_remote: true },
    });
  }

  async createPrivateMessage(
    payload: Parameters<BaseClient["createPrivateMessage"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createPrivateMessage"]> {
    const response = await this.#client.POST("/api/alpha/private_message", {
      ...options,
      body: { ...payload },
    });

    return {
      private_message_view: compat.toPrivateMessageView(
        response.data!.private_message_view,
      ),
    };
  }

  async createPrivateMessageReport(
    payload: Parameters<BaseClient["createPrivateMessageReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createPrivateMessageReport"]> {
    await this.#client.POST("/api/alpha/private_message/report", {
      ...options,
      body: {
        private_message_id: payload.private_message_id,
        reason: payload.reason,
      },
    });
  }

  async deleteComment(
    payload: Parameters<BaseClient["deleteComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["deleteComment"]> {
    const response = await this.#client.POST("/api/alpha/comment/delete", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async deleteImage(
    payload: Parameters<BaseClient["deleteImage"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["deleteImage"]> {
    if (
      typeof payload.delete_token !== "string" ||
      typeof payload.url !== "string" ||
      payload.url.length === 0 ||
      payload.url.trim() !== payload.url
    )
      throw new InvalidPayloadError("Invalid PieFed image deletion payload");

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(payload.url);
    } catch {
      throw new InvalidPayloadError("Invalid PieFed image deletion payload");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
      throw new InvalidPayloadError("Invalid PieFed image deletion payload");

    await this.#client.POST("/api/alpha/image/delete", {
      ...options,
      // PieFed verifies ownership from the bearer token and identifies the
      // upload by its full URL; Lemmy's delete token has no wire equivalent.
      body: { file: payload.url },
    });
  }

  async deletePost(
    payload: { deleted: boolean; post_id: number },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/api/alpha/post/delete", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async distinguishComment(
    payload: Parameters<BaseClient["distinguishComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["distinguishComment"]> {
    const response = await this.#client.POST("/api/alpha/comment/distinguish", {
      ...options,
      body: {
        comment_reply_id: payload.comment_id,
        distinguished: payload.distinguished,
      },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async editComment(
    payload: Parameters<BaseClient["editComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["editComment"]> {
    const response = await this.#client.PUT("/api/alpha/comment", {
      ...options,
      body: {
        ...payload,
        body: payload.content,
        // TODO: piefed types say this is required, but it's not
      } as unknown as components["schemas"]["EditCommentRequest"] & {
        distinguished: boolean;
      },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async editCommunityNotifications(
    payload: Parameters<BaseClient["editCommunityNotifications"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["editCommunityNotifications"]> {
    await this.#client.PUT("/api/alpha/community/subscribe", {
      ...options,
      body: {
        community_id: payload.community_id,
        subscribe: compat.fromCommunityNotificationsMode(payload.mode),
      },
    });
  }

  async editPost(
    payload: Parameters<BaseClient["editPost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.PUT("/api/alpha/post", {
      ...options,
      body: {
        ...payload,
        title: payload.name,
      },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async editPostNotifications(
    payload: Parameters<BaseClient["editPostNotifications"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["editPostNotifications"]> {
    await this.#client.PUT("/api/alpha/post/subscribe", {
      ...options,
      body: {
        post_id: payload.post_id,
        subscribe: compat.fromPostNotificationsMode(payload.mode),
      },
    });
  }

  async featurePost(
    payload: Parameters<BaseClient["featurePost"]>[0],
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/api/alpha/post/feature", {
      ...options,
      body: {
        ...payload,
        feature_type:
          payload.feature_type === "community" ? "Community" : "Local",
      },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async followCommunity(
    payload: Parameters<BaseClient["followCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["followCommunity"]> {
    const response = await this.#client.POST("/api/alpha/community/follow", {
      ...options,
      body: { ...payload },
    });

    return {
      community_view: compat.toCommunityView(response.data!.community_view),
    };
  }

  async getCaptcha(
    ..._params: Parameters<BaseClient["getCaptcha"]>
  ): ReturnType<BaseClient["getCaptcha"]> {
    throw new UnsupportedError("Get captcha is not supported by piefed");
  }

  async getComments(
    payload: Parameters<BaseClient["getComments"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getComments"]> {
    if (payload.mode && payload.mode !== "piefed")
      throw new InvalidPayloadError(
        `Connected to piefed, ${payload.mode} is not supported`,
      );

    // PieFed's shallowest response still contains top-level comments, so a
    // canonical request for zero levels has no PieFed equivalent — answer
    // it directly rather than asking for something else and returning more
    // than the caller wanted.
    if (
      payload.max_depth !== undefined &&
      payload.max_depth <= 0 &&
      payload.parent_id === undefined
    )
      return { ...compat.toPageResponse(payload, { items: 0 }), data: [] };

    const { type_, ...rest } = compat.fromPageParams(payload);
    const query = {
      ...rest,
      max_depth: toPiefedMaxDepth(payload),
      ...(type_ && { type_: compat.fromListingType(type_) }),
    } satisfies paths["/api/alpha/comment/list"]["get"]["parameters"]["query"];

    const response = await this.#client.GET("/api/alpha/comment/list", {
      ...options,
      params: { query },
    });

    const data = response.data!.comments.map(compat.toCommentView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }

  async getCommunity(
    payload: Parameters<BaseClient["getCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getCommunity"]> {
    const response = await this.#client.GET("/api/alpha/community", {
      ...options,
      params: { query: payload },
    });

    return compat.toGetCommunityResponse(response.data!);
  }

  async getFederatedInstances(
    options?: RequestOptions,
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.#client.GET("/api/alpha/federated_instances", {
      ...options,
    });

    const federated = response.data!.federated_instances;
    if (!federated) return { federated_instances: undefined };

    return {
      federated_instances: {
        allowed: federated.allowed.map(compat.toInstanceWithFederationState),
        blocked: federated.blocked.map(compat.toInstanceWithFederationState),
        linked: federated.linked.map(compat.toInstanceWithFederationState),
      },
    };
  }

  async getModlog(
    payload: Parameters<BaseClient["getModlog"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getModlog"]> {
    const state = decodeModlogCursor(payload);
    const targetSize = validateModlogLimit(payload.limit) ?? state.batchSize;
    const pageCache = new Map<number, Promise<PiefedModlogResponse>>();
    const bucketCache = new Map<string, Promise<types.ModlogItem[]>>();

    const loadPage = (page: number): Promise<PiefedModlogResponse> => {
      const cached = pageCache.get(page);
      if (cached) return cached;

      const query = {
        ...state.filters,
        limit: state.batchSize,
        page,
      } satisfies NonNullable<
        paths["/api/alpha/modlog"]["get"]["parameters"]["query"]
      >;
      const pending = this.#client
        .GET("/api/alpha/modlog", {
          ...options,
          params: { query },
        })
        .then((response) => response.data!);
      pageCache.set(page, pending);
      return pending;
    };

    const loadBucket = (
      bucket: PiefedModlogBucket,
      page: number,
    ): Promise<types.ModlogItem[]> => {
      const key = `${page}:${bucket}`;
      const cached = bucketCache.get(key);
      if (cached) return cached;

      const pending = loadPage(page).then((response) => {
        const items = response[bucket];
        if (items.length > state.batchSize)
          throw new UnexpectedResponseError(
            `PieFed modlog bucket ${bucket} exceeded the requested limit`,
          );

        const mapped = items.map((item) => compat.toModlogView(item));
        // Sorting does not invoke its comparator for a one-row bucket, so
        // validate each timestamp explicitly before it can become a head.
        for (const item of mapped) compat.compareModlogChronology(item, item);
        return mapped.sort(compat.compareModlogItems);
      });
      bucketCache.set(key, pending);
      return pending;
    };

    const heads = async () =>
      (
        await Promise.all(
          MODLOG_BUCKETS.map(async (bucket) => ({
            bucket,
            item: await ensureModlogHead(state, bucket, loadBucket),
          })),
        )
      ).filter(
        (
          candidate,
        ): candidate is {
          bucket: PiefedModlogBucket;
          item: types.ModlogItem;
        } => candidate.item !== undefined,
      );

    const data: types.ModlogItem[] = [];
    while (data.length < targetSize) {
      const candidates = await heads();
      if (candidates.length === 0) break;

      candidates.sort(
        (left, right) =>
          compat.compareModlogChronology(left.item, right.item) ||
          MODLOG_BUCKET_INDEX[left.bucket] - MODLOG_BUCKET_INDEX[right.bucket],
      );
      const next = candidates[0]!;
      const cursor = state.sources[next.bucket];
      if (!cursor)
        throw new UnexpectedResponseError(
          `Missing PieFed modlog cursor for ${next.bucket}`,
        );

      data.push(next.item);
      cursor.offset += 1;

      const bucketItems = await loadBucket(next.bucket, cursor.page);
      if (cursor.offset >= bucketItems.length) {
        if (bucketItems.length < state.batchSize) {
          state.sources[next.bucket] = null;
        } else {
          const nextPage = cursor.page + 1;
          if (!isPositiveInteger(nextPage))
            throw new UnexpectedResponseError(
              "PieFed modlog exceeded the safe page range",
            );
          state.sources[next.bucket] = { offset: 0, page: nextPage };
        }
      }
    }

    const hasNext = MODLOG_BUCKETS.some((bucket) => state.sources[bucket]);

    return {
      data,
      next_page: hasNext ? encodeModlogCursor(state) : undefined,
    };
  }

  async getNotifications(
    payload: Parameters<BaseClient["getNotifications"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getNotifications"]> {
    const page = compat.fromPageParams({
      limit: payload.limit,
      page_cursor: payload.page_cursor,
    });
    const queryForPage = (currentPage = page.page) => ({
      limit: page.limit,
      page: currentPage,
      // PieFed defaults this to true; canonical omission means all rows.
      unread_only: payload.unread_only ?? false,
    });
    const pageParams = (currentPage = page.page) => ({
      ...payload,
      page_cursor: currentPage,
    });

    const fetchReplies = async (currentPage = page.page) => {
      const response = await this.#client.GET("/api/alpha/user/replies", {
        ...options,
        params: { query: queryForPage(currentPage) },
      });
      const data = response.data!.replies.map(compat.toReplyNotificationView);
      return {
        ...compat.toPageResponse(pageParams(currentPage), {
          items: data.length,
          next_page: response.data!.next_page,
        }),
        data,
      };
    };
    const fetchMessages = async (currentPage = page.page) => {
      const response = await this.#client.GET(
        "/api/alpha/private_message/list",
        {
          ...options,
          params: { query: queryForPage(currentPage) },
        },
      );
      const data = response.data!.private_messages.map(
        compat.toPrivateMessageNotificationView,
      );
      return {
        // PieFed clamps the requested limit server-side but omits next_page
        // from this response. Any nonempty page may therefore have more;
        // advance once and let the first empty page prove exhaustion.
        ...compat.toPageResponse(
          { page_cursor: currentPage },
          {
            items: data.length,
          },
        ),
        data,
      };
    };
    const fetchGeneric = async (
      include: "all" | "mention" | "subscribed",
      currentPage = page.page,
      scanEmptyPages = false,
    ) => {
      let recipientId: number | undefined;
      const visitedPages = new Set([currentPage ?? 1]);

      while (true) {
        const response = await this.#client.GET(
          "/api/alpha/user/notifications",
          {
            ...options,
            params: {
              query: {
                limit: page.limit,
                page: currentPage,
                status: payload.unread_only ? "Unread" : "All",
              },
            },
          },
        );
        const items = response.data!.items;
        const selectedItems = items.filter(
          (item) =>
            (include !== "subscribed" && item.notif_type === 6) ||
            (include !== "mention" && [0, 1, 2, 5].includes(item.notif_type)),
        );
        const data: types.NotificationView[] = [];

        if (selectedItems.length > 0) {
          const resolvedRecipientId =
            recipientId ?? (await this.#getCurrentPersonId(options));
          recipientId = resolvedRecipientId;
          const mappedItems = await Promise.all(
            selectedItems.map(async (item) => {
              if (item.notif_type !== 6)
                return compat.toSubscribedNotificationView(
                  item,
                  resolvedRecipientId,
                );

              const commentResponse =
                item.notif_subtype === "comment_mention" &&
                item.comment_id !== undefined
                  ? await this.#client.GET("/api/alpha/comment", {
                      ...options,
                      params: { query: { id: item.comment_id } },
                    })
                  : undefined;

              return compat.toMentionNotificationViewFromGeneric(
                item,
                resolvedRecipientId,
                commentResponse?.data!.comment_view,
              );
            }),
          );
          data.push(...mappedItems.filter((item) => item !== undefined));
        }
        const serverCursor = response.data!.next_page;
        const parsedServerCursor =
          serverCursor == null ? undefined : Number(serverCursor);
        const pagination: types.PagableResponse =
          items.length === 0 && Number.isFinite(parsedServerCursor)
            ? { next_page: parsedServerCursor }
            : compat.toPageResponse(pageParams(currentPage), {
                // PieFed paginates before filtering numeric notification
                // kinds, and can therefore return an empty wire page with a
                // live cursor. The branch above preserves that cursor.
                items: items.length,
                next_page: serverCursor,
              });
        const nextPage = pagination.next_page;

        if (!scanEmptyPages || data.length > 0 || nextPage === undefined)
          return { ...pagination, data };

        if (typeof nextPage !== "number")
          throw new UnexpectedResponseError(
            `PieFed returned a non-numeric notifications cursor: ${nextPage}`,
          );

        if (visitedPages.has(nextPage))
          throw new UnexpectedResponseError(
            `PieFed returned a cyclic notifications cursor at page ${nextPage}`,
          );

        visitedPages.add(nextPage);
        currentPage = nextPage;
      }
    };

    switch (payload.type_) {
      case "all":
      case undefined: {
        let currentPage = page.page;
        const visitedPages = new Set([currentPage ?? 1]);

        while (true) {
          // Keep every source on the same numeric page. Advancing only the
          // generic stream can otherwise return a later subscribed row and
          // then duplicate it when the shared cursor catches up.
          const [replies, messages, generic] = await Promise.all([
            fetchReplies(currentPage),
            fetchMessages(currentPage),
            fetchGeneric("all", currentPage),
          ]);
          const data = [
            ...replies.data,
            ...messages.data,
            ...generic.data,
          ].sort(
            (a, b) =>
              Date.parse(b.notification.published_at) -
              Date.parse(a.notification.published_at),
          );
          const nextPages = [replies, messages, generic].flatMap((result) =>
            typeof result.next_page === "number" ? [result.next_page] : [],
          );
          const nextPage =
            nextPages.length === 0 ? undefined : Math.min(...nextPages);

          if (data.length > 0 || nextPage === undefined)
            return { data, next_page: nextPage };

          if (visitedPages.has(nextPage))
            throw new UnexpectedResponseError(
              `PieFed returned a cyclic all-notifications cursor at page ${nextPage}`,
            );

          visitedPages.add(nextPage);
          currentPage = nextPage;
        }
      }
      case "mention":
        return fetchGeneric("mention", page.page, true);
      case "mod_action":
        throw new UnsupportedError(
          "Listing moderation notifications is not supported by piefed",
        );
      case "private_message":
        return fetchMessages();
      case "reply":
        return fetchReplies();
      case "subscribed":
        // The generic PieFed route paginates before filtering its numeric
        // kinds. Skip leading non-subscribed pages so Voyager never receives
        // an empty page with a live cursor and prematurely ends the feed.
        return fetchGeneric("subscribed", page.page, true);
    }
  }

  async getPersonDetails(
    payload: Parameters<BaseClient["getPersonDetails"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPersonDetails"]> {
    const response = await this.#client.GET("/api/alpha/user", {
      ...options,
      params: { query: payload },
    });

    return {
      ...response.data!,
      moderates: response.data!.moderates.map(compat.toCommunityModeratorView),
      person_view: compat.toPersonView(response.data!.person_view),
    };
  }

  async getPost(
    payload: Parameters<BaseClient["getPost"]>[0],
    options?: RequestOptions,
  ) {
    const query =
      payload satisfies paths["/api/alpha/post"]["get"]["parameters"]["query"];

    const response = await this.#client.GET("/api/alpha/post", {
      ...options,
      params: { query },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPosts"]> {
    if (payload.mode && payload.mode !== "piefed")
      throw new InvalidPayloadError(
        `Connected to piefed, ${payload.mode} is not supported`,
      );

    const { type_, ...rest } = compat.fromPageParams(payload);
    const query = {
      ...rest,
      type_: compat.fromListingType(type_),
    } satisfies paths["/api/alpha/post/list"]["get"]["parameters"]["query"];

    const response = await this.#client.GET("/api/alpha/post/list", {
      ...options,
      params: { query },
    });

    const data = response.data!.posts.map(compat.toPostView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }

  async getRandomCommunity(
    ..._params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    throw new UnsupportedError(
      "Get random community is not supported by piefed",
    );
  }

  async getSite(options?: RequestOptions): ReturnType<BaseClient["getSite"]> {
    const response = await this.#client.GET("/api/alpha/site", {
      ...options,
    });
    const myUser = response.data!.my_user;
    // Some deployed PieFed instances omit or null `admins` despite the
    // OpenAPI requirement. Missing evidence must never grant admin access.
    const admins = Array.isArray(response.data!.admins)
      ? response.data!.admins.filter(
          (admin): admin is components["schemas"]["PersonView"] =>
            admin != null,
        )
      : [];
    const currentPersonId = myUser?.local_user_view.person.id;
    // PieFed's my_user wire has no admin bit. Require both stable-id
    // membership in the server's admin enumeration and its per-row is_admin
    // assertion so inconsistent/stale rows cannot create a false positive.
    const currentUserIsAdmin =
      currentPersonId !== undefined &&
      admins.some(
        (admin) =>
          admin.is_admin === true && admin.person.id === currentPersonId,
      );

    return {
      ...response.data!,
      admins: admins.map(compat.toPersonView),
      my_user: myUser
        ? {
            community_blocks: myUser.community_blocks.map(({ community }) =>
              compat.toCommunity(community!),
            ),
            follows: myUser.follows.map((f) => ({
              community: compat.toCommunity(f.community),
              follower: compat.toPerson(f.follower),
            })),
            instance_blocks: myUser.instance_blocks.map(({ instance }) =>
              compat.toInstance(instance),
            ),
            local_user_view: {
              local_user: {
                admin: currentUserIsAdmin,
                show_nsfw: myUser.local_user_view.local_user.show_nsfw,
              },
              person: compat.toPerson(
                myUser.local_user_view.person,
                myUser.local_user_view.counts,
              ),
            },
            moderates: myUser.moderates.map(compat.toCommunityModeratorView),
            person_blocks: myUser.person_blocks.map(({ target }) =>
              compat.toPerson(target),
            ),
          }
        : undefined,
      site_view: {
        local_site: compat.toLocalSite(response.data!.site),
        site: compat.toSite(response.data!.site),
      },
    };
  }

  async getSiteMetadata(
    payload: Parameters<BaseClient["getSiteMetadata"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    const response = await this.#client.GET("/api/alpha/post/site_metadata", {
      ...options,
      params: { query: payload },
    });

    return response.data!;
  }

  async getUnreadCount(options?: RequestOptions) {
    const response = await this.#client.GET("/api/alpha/user/unread_count", {
      ...options,
    });

    return response.data!;
  }

  async likeComment(
    payload: Parameters<BaseClient["likeComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["likeComment"]> {
    const response = await this.#client.POST("/api/alpha/comment/like", {
      ...options,
      body: {
        comment_id: payload.comment_id,
        private: false,
        score: toScore(payload.is_upvote),
      },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async likePost(
    payload: Parameters<BaseClient["likePost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.POST("/api/alpha/post/like", {
      ...options,
      body: {
        post_id: payload.post_id,
        score: toScore(payload.is_upvote),
      },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async listCommentReports(
    payload: Parameters<BaseClient["listCommentReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommentReports"]> {
    const query = compat.fromPageParams(payload) satisfies NonNullable<
      paths["/api/alpha/comment/report/list"]["get"]["parameters"]["query"]
    >;
    const response = await this.#client.GET("/api/alpha/comment/report/list", {
      ...options,
      params: { query },
    });
    const data = response.data!.comment_reports.map(compat.toCommentReportView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommunities"]> {
    const { type_, ...rest } = compat.fromPageParams(payload);
    const response = await this.#client.GET("/api/alpha/community/list", {
      ...options,
      params: {
        // @ts-expect-error `sort` from the unioned payload type leaks v1 values (e.g. "comments") that piefed doesn't accept
        query: { ...rest, type_: compat.fromListingType(type_) },
      },
    });

    const data = response.data!.communities.map(compat.toCommunityView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }

  async listPersonContent(
    payload: ListPersonContent,
    options?: RequestOptions,
  ): Promise<ListPersonContentResponse> {
    if (payload.mode && payload.mode !== "piefed")
      throw new InvalidPayloadError(
        `Connected to piefed, ${payload.mode} is not supported`,
      );

    switch (payload.type) {
      case "all":
      case undefined: {
        const [posts, comments] = await Promise.all([
          this.#listPersonPosts(payload, options),
          this.#listPersonComments(payload, options),
        ]);

        const data = [...posts.data, ...comments.data].sort(
          (a, b) =>
            getPostCommentItemCreatedDate(b) - getPostCommentItemCreatedDate(a),
        );

        // Both halves already resolved the server's own cursor; either one
        // having more means this merged feed does too. More reliable than
        // inferring from the merged length, since piefed silently clamps
        // large limits.
        return {
          data,
          next_page: posts.next_page ?? comments.next_page,
        };
      }

      case "comments":
        return this.#listPersonComments(payload, options);

      case "posts":
        return this.#listPersonPosts(payload, options);
    }
  }

  async listPersonLiked(
    payload: Parameters<BaseClient["listPersonLiked"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonLiked"]> {
    const { like_type, ...pageParams } = payload;

    if (like_type === "disliked_only")
      throw new UnsupportedError(
        "Listing downvoted content is not supported by piefed",
      );

    const query = {
      ...compat.fromPageParams(pageParams),
      liked_only: true,
      sort: "New" as const,
    } satisfies NonNullable<
      paths["/api/alpha/comment/list"]["get"]["parameters"]["query"]
    > &
      NonNullable<paths["/api/alpha/post/list"]["get"]["parameters"]["query"]>;

    const [postsResponse, commentsResponse] = await Promise.all([
      this.#client.GET("/api/alpha/post/list", {
        ...options,
        params: { query },
      }),
      this.#client.GET("/api/alpha/comment/list", {
        ...options,
        params: { query },
      }),
    ]);

    const rawData: types.PersonContentItem[] = [
      ...postsResponse.data!.posts.map(compat.toPostView),
      ...commentsResponse.data!.comments.map(compat.toCommentView),
    ];
    const data = rawData
      .filter((item) => item.my_vote === 1)
      .sort(
        (a, b) =>
          getPostCommentItemCreatedDate(b) - getPostCommentItemCreatedDate(a),
      );

    return {
      ...compat.toPageResponse(pageParams, {
        items: rawData.length,
        next_page:
          postsResponse.data!.next_page ??
          commentsResponse.data!.next_page ??
          null,
      }),
      data,
    };
  }

  async listPersonSaved(
    payload: Parameters<BaseClient["listPersonSaved"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonSaved"]> {
    const response = await this.#client.GET("/api/alpha/user", {
      ...options,
      params: {
        query: { ...compat.fromPageParams(payload), saved_only: true },
      },
    });

    const data = [
      ...response.data!.posts.map(compat.toPostView),
      ...response.data!.comments.map(compat.toCommentView),
    ].sort(
      (a, b) =>
        getPostCommentItemCreatedDate(b) - getPostCommentItemCreatedDate(a),
    );

    return {
      ...compat.toPageResponse(payload, { items: data.length }),
      data,
    };
  }

  async listPostReports(
    payload: Parameters<BaseClient["listPostReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPostReports"]> {
    const query = compat.fromPageParams(payload) satisfies NonNullable<
      paths["/api/alpha/post/report/list"]["get"]["parameters"]["query"]
    >;
    const response = await this.#client.GET("/api/alpha/post/report/list", {
      ...options,
      params: { query },
    });
    const data = response.data!.post_reports.map(compat.toPostReportView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }

  async listReports(
    payload: Parameters<BaseClient["listReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listReports"]> {
    const state = decodeReportCursor(payload);
    const targetSize = validateReportLimit(payload.limit) ?? state.batchSize;
    const commentBuffer: ReportPageBuffer<PiefedCommentReportView> = {
      cursor: state.comment ? { ...state.comment } : null,
      items: [],
      loaded: false,
      nextPage: undefined,
    };
    const postBuffer: ReportPageBuffer<PiefedPostReportView> = {
      cursor: state.post ? { ...state.post } : null,
      items: [],
      loaded: false,
      nextPage: undefined,
    };

    const loadCommentPage = async (page: number) => {
      const query = {
        community_id: payload.community_id,
        limit: state.batchSize,
        page,
        unresolved_only: payload.unresolved_only,
      } satisfies NonNullable<
        paths["/api/alpha/comment/report/list"]["get"]["parameters"]["query"]
      >;
      const response = await this.#client.GET(
        "/api/alpha/comment/report/list",
        { ...options, params: { query } },
      );

      return {
        // PieFed currently has no SQL order_by on report-list queries. Sort
        // each fetched page so retries/refetches have deterministic heads.
        items: sortReportPage(response.data!.comment_reports),
        nextPage: toServerReportPage(response.data!.next_page),
      };
    };
    const loadPostPage = async (page: number) => {
      const query = {
        community_id: payload.community_id,
        limit: state.batchSize,
        page,
        unresolved_only: payload.unresolved_only,
      } satisfies NonNullable<
        paths["/api/alpha/post/report/list"]["get"]["parameters"]["query"]
      >;
      const response = await this.#client.GET("/api/alpha/post/report/list", {
        ...options,
        params: { query },
      });

      return {
        items: sortReportPage(response.data!.post_reports),
        nextPage: toServerReportPage(response.data!.next_page),
      };
    };

    const data: (types.CommentReportView | types.PostReportView)[] = [];
    while (data.length < targetSize) {
      const [comment, post] = await Promise.all([
        ensureReportHead(commentBuffer, loadCommentPage),
        ensureReportHead(postBuffer, loadPostPage),
      ]);

      if (!comment && !post) break;

      const commentPublished = comment ? reportPublishedAt(comment) : undefined;
      const postPublished = post ? reportPublishedAt(post) : undefined;
      const comparable =
        commentPublished !== undefined && postPublished !== undefined;
      const timestampsDiffer = comparable && commentPublished !== postPublished;
      const chooseComment =
        !!comment &&
        (!post ||
          (timestampsDiffer && commentPublished > postPublished) ||
          (!timestampsDiffer && state.nextKind === "comment"));

      if (chooseComment) {
        data.push(compat.toCommentReportView(takeReportHead(commentBuffer)));
        if (post && !timestampsDiffer) state.nextKind = "post";
      } else if (post) {
        data.push(compat.toPostReportView(takeReportHead(postBuffer)));
        if (comment && !timestampsDiffer) state.nextKind = "comment";
      }
    }

    const nextState = {
      ...state,
      comment: commentBuffer.cursor,
      post: postBuffer.cursor,
    } satisfies ReportCursorState;

    return {
      data,
      next_page:
        nextState.comment || nextState.post
          ? encodeReportCursor(nextState)
          : undefined,
    };
  }

  async lockPost(
    payload: { locked: boolean; post_id: number },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/api/alpha/post/lock", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async login(
    payload: Parameters<BaseClient["login"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.POST("/api/alpha/user/login", {
      ...options,
      body: { password: payload.password, username: payload.username_or_email },
    });
    return response.data!;
  }

  async logout(options?: RequestOptions): ReturnType<BaseClient["logout"]> {
    await this.#client.POST("/api/alpha/user/logout", options);
  }

  async markAllAsRead(options: Parameters<BaseClient["markAllAsRead"]>[0]) {
    // Despite its legacy name, upstream marks every Notification row (the
    // generic followed-post/mention store) plus conversations and messages.
    // The newer notification-only PUT would be a redundant second mutation.
    await this.#client.POST("/api/alpha/user/mark_all_as_read", options);
  }

  async markNotificationAsRead(
    payload: Parameters<BaseClient["markNotificationAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markNotificationAsRead"]> {
    const { kind, notification_id, read } = payload;
    switch (kind) {
      case "mention":
        await this.#client.PUT("/api/alpha/user/notification_state", {
          ...options,
          body: { notif_id: notification_id, read_state: read },
        });
        return;
      case "mod_action":
        throw new UnsupportedError(
          "Marking moderation notifications as read is not supported by piefed",
        );
      case "private_message":
        await this.#client.POST("/api/alpha/private_message/mark_as_read", {
          ...options,
          body: { private_message_id: notification_id, read },
        });
        return;
      case "reply":
        // Replies still come from the legacy route and expose CommentReply ids.
        await this.#client.POST("/api/alpha/comment/mark_as_read", {
          ...options,
          body: { comment_reply_id: notification_id, read },
        });
        return;
      case "subscribed":
        // Generic mention/subscription rows expose Notification ids.
        await this.#client.PUT("/api/alpha/user/notification_state", {
          ...options,
          body: { notif_id: notification_id, read_state: read },
        });
        return;
    }
  }

  async markPostAsRead(
    payload: Parameters<BaseClient["markPostAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markPostAsRead"]> {
    await this.#client.POST("/api/alpha/post/mark_as_read", {
      ...options,
      body: payload,
    });
  }

  async register(
    ..._params: Parameters<BaseClient["register"]>
  ): ReturnType<BaseClient["register"]> {
    throw new UnsupportedError("Register is not supported by piefed");
  }

  async removeComment(
    payload: Parameters<BaseClient["removeComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["removeComment"]> {
    const response = await this.#client.POST("/api/alpha/comment/remove", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async removePost(
    payload: { post_id: number; removed: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/api/alpha/post/remove", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async resolveCommentReport(
    payload: Parameters<BaseClient["resolveCommentReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["resolveCommentReport"]> {
    await this.#client.PUT("/api/alpha/comment/report/resolve", {
      ...options,
      body: { ...payload },
    });
  }

  async resolveObject(
    payload: Parameters<BaseClient["resolveObject"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["resolveObject"]> {
    const response = await this.#client.GET("/api/alpha/resolve_object", {
      ...options,
      params: { query: payload },
    });

    // @ts-expect-error TODO: error handling
    if (!response.data) throw new Error(response.error.error);

    return {
      ...response.data,
      comment: response.data.comment
        ? compat.toCommentView(response.data.comment)
        : undefined,
      community: response.data.community
        ? compat.toCommunityView(response.data.community)
        : undefined,
      person: response.data.person
        ? compat.toPersonView(response.data!.person)
        : undefined,
      post: response.data.post
        ? compat.toPostView(response.data!.post)
        : undefined,
    };
  }

  async resolvePostReport(
    payload: Parameters<BaseClient["resolvePostReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["resolvePostReport"]> {
    await this.#client.PUT("/api/alpha/post/report/resolve", {
      ...options,
      body: { ...payload },
    });
  }

  async saveComment(
    payload: Parameters<BaseClient["saveComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["saveComment"]> {
    const response = await this.#client.PUT("/api/alpha/comment/save", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compat.toCommentView(response.data!.comment_view),
    };
  }

  async savePost(
    payload: Parameters<BaseClient["savePost"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["savePost"]> {
    const response = await this.#client.PUT("/api/alpha/post/save", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async saveUserSettings(
    payload: Parameters<BaseClient["saveUserSettings"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["saveUserSettings"]> {
    await this.#client.PUT("/api/alpha/user/save_user_settings", {
      ...options,
      body: { show_nsfw: payload.show_nsfw },
    });
  }

  async search(
    payload: Parameters<BaseClient["search"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["search"]> {
    const { listing_type, search_term, type_, ...rest } =
      compat.fromPageParams(payload);

    // PieFed requires a concrete `type_` — its enum has no "All" — so an
    // all-type search fans out and merges, matching what the canonical
    // `type_: "all"` (or an unspecified type) means everywhere else.
    const searchTypes: SearchableType[] =
      !type_ || type_ === "all"
        ? ["communities", "posts", "users", "comments"]
        : [type_];

    const searchOne = async (searchType: SearchableType) => {
      const response = await this.#client.GET("/api/alpha/search", {
        ...options,
        params: {
          query: {
            ...rest,
            listing_type: compat.fromListingType(listing_type),
            q: search_term,
            type_: PIEFED_SEARCH_TYPE[searchType],
          },
        },
      });

      // Each response carries every bucket, but only the requested one is
      // populated — take just that bucket so a fan-out can't double-count
      switch (searchType) {
        case "comments":
          return response.data!.comments.map(compat.toCommentView);
        case "communities":
          return response.data!.communities.map(compat.toCommunityView);
        case "posts":
          return response.data!.posts.map(compat.toPostView);
        case "users":
          return response.data!.users.map(compat.toPersonView);
      }
    };

    const data = (await Promise.all(searchTypes.map(searchOne))).flat();

    return {
      ...compat.toPageResponse(payload, { items: data.length }),
      data,
    };
  }

  async uploadImage(
    payload: Parameters<BaseClient["uploadImage"]>[0],
    options?: RequestOptions,
  ) {
    const formData = new FormData();
    formData.append("file", payload.image);

    // In Android, openapi-fetch internally calls new Request().
    // This is usually ok, but causes content-type in the form body
    // for each file to be application/octet-stream.
    // We need to use a custom fetch function to pass the
    // form data directly to capacitor's fetch.

    const response = await this.#customFetch(
      `${this.#url}/api/alpha/upload/image`,
      {
        ...options,
        body: formData,
        headers: this.#headers,
        method: "POST",
      },
    );

    await validateResponse(response);

    const data = await response.json();

    return {
      url: data.url,
    };
  }

  async #getCurrentPersonId(options?: RequestOptions): Promise<number> {
    this.#currentPersonIdPromise ??= this.#client
      .GET("/api/alpha/user/me", options)
      .then((response) => response.data!.local_user_view.person.id);

    try {
      return await this.#currentPersonIdPromise;
    } catch (error) {
      // A transient lookup failure must not poison this client forever.
      this.#currentPersonIdPromise = undefined;
      throw error;
    }
  }

  async #listPersonComments(
    payload: PiefedCommentListPayload,
    options?: RequestOptions,
  ) {
    const query = {
      ...compat.fromPageParams({
        limit: payload.limit,
        page_cursor: payload.page_cursor,
        person_id: payload.person_id,
      }),
      sort: payload.sort ?? "New",
    } satisfies NonNullable<
      paths["/api/alpha/comment/list"]["get"]["parameters"]["query"]
    >;

    const response = await this.#client.GET("/api/alpha/comment/list", {
      ...options,
      params: { query },
    });

    const data = response.data!.comments.map(compat.toCommentView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }

  async #listPersonPosts(
    payload: PiefedPostListPayload,
    options?: RequestOptions,
  ) {
    const query = {
      ...compat.fromPageParams({
        limit: payload.limit,
        page_cursor: payload.page_cursor,
        person_id: payload.person_id,
      }),
      sort: payload.sort ?? "New",
    } satisfies NonNullable<
      paths["/api/alpha/post/list"]["get"]["parameters"]["query"]
    >;

    const response = await this.#client.GET("/api/alpha/post/list", {
      ...options,
      params: { query },
    });

    const data = response.data!.posts.map(compat.toPostView);

    return {
      ...compat.toPageResponse(payload, {
        items: data.length,
        next_page: response.data!.next_page,
      }),
      data,
    };
  }
}

function advanceReportBuffer<T>(buffer: ReportPageBuffer<T>) {
  const currentPage = buffer.cursor?.page;
  const nextPage = buffer.nextPage;

  buffer.cursor =
    currentPage !== undefined &&
    nextPage !== undefined &&
    nextPage > currentPage
      ? { offset: 0, page: nextPage }
      : null;
  buffer.items = [];
  buffer.loaded = false;
  buffer.nextPage = undefined;
}

function decodeModlogCursor(
  payload: Parameters<BaseClient["getModlog"]>[0],
): ModlogCursorState {
  const requestedLimit = validateModlogLimit(payload.limit);
  const filters = toModlogCursorFilters(payload);
  if (
    !Object.values(filters).every(
      (filter) => filter === undefined || isPositiveInteger(filter),
    )
  )
    throw new InvalidPayloadError(
      "PieFed modlog filters must be positive integers",
    );

  if (typeof payload.page_cursor !== "string") {
    const page = payload.page_cursor ?? 1;
    if (!isPositiveInteger(page))
      throw new InvalidPayloadError("Invalid PieFed modlog page cursor");

    return {
      batchSize: Math.min(
        requestedLimit ?? DEFAULT_MODLOG_PAGE_SIZE,
        MAX_MODLOG_BATCH_SIZE,
      ),
      filters,
      sources: modlogSourcesAtPage(page),
    };
  }

  try {
    if (
      payload.page_cursor.length > 2_048 ||
      !payload.page_cursor.startsWith(MODLOG_CURSOR_PREFIX)
    )
      throw new Error("invalid prefix");

    const serializedCursor = payload.page_cursor.slice(
      MODLOG_CURSOR_PREFIX.length,
    );
    const checksumSeparator = serializedCursor.lastIndexOf(".");
    if (checksumSeparator < 1) throw new Error("missing checksum");

    const encoded = serializedCursor.slice(0, checksumSeparator);
    const checksum = serializedCursor.slice(checksumSeparator + 1);
    if (checksum !== modlogCursorChecksum(encoded))
      throw new Error("invalid checksum");

    const raw: unknown = JSON.parse(decodeURIComponent(encoded));
    if (!raw || typeof raw !== "object") throw new Error("invalid object");
    if (Object.keys(raw).sort().join(",") !== "b,f,s")
      throw new Error("invalid keys");

    const serialized = raw as Partial<SerializedModlogCursor>;
    if (
      !isPositiveInteger(serialized.b) ||
      serialized.b > MAX_MODLOG_BATCH_SIZE ||
      !Array.isArray(serialized.f) ||
      serialized.f.length !== 5 ||
      !serialized.f.every(isNullablePositiveInteger) ||
      !Array.isArray(serialized.s) ||
      serialized.s.length !== MODLOG_BUCKETS.length ||
      !serialized.s.every((source) =>
        isModlogSourceCursor(source, serialized.b),
      )
    )
      throw new Error("invalid fields");

    const filterValues = serialized.f as SerializedModlogCursor["f"];
    const decodedFilters = {
      comment_id: filterValues[0] ?? undefined,
      community_id: filterValues[1] ?? undefined,
      mod_person_id: filterValues[2] ?? undefined,
      other_person_id: filterValues[3] ?? undefined,
      post_id: filterValues[4] ?? undefined,
    } satisfies ModlogCursorFilters;

    if (!modlogFiltersEqual(decodedFilters, filters))
      throw new Error("filter mismatch");

    const sources = {} as ModlogCursorState["sources"];
    for (const bucket of MODLOG_BUCKETS) {
      const source = serialized.s[MODLOG_BUCKET_INDEX[bucket]]!;
      sources[bucket] = toModlogSourceCursor(source);
    }

    return {
      batchSize: serialized.b,
      filters: decodedFilters,
      sources,
    };
  } catch {
    throw new InvalidPayloadError("Invalid PieFed modlog page cursor");
  }
}

function decodeReportCursor(
  payload: Parameters<BaseClient["listReports"]>[0],
): ReportCursorState {
  const requestedLimit = validateReportLimit(payload.limit);

  if (typeof payload.page_cursor !== "string") {
    const page = payload.page_cursor ?? 1;
    if (!Number.isInteger(page) || page < 1)
      throw new InvalidPayloadError("Invalid PieFed report page cursor");

    return {
      batchSize: requestedLimit ?? DEFAULT_REPORT_PAGE_SIZE,
      comment: { offset: 0, page },
      communityId: payload.community_id,
      nextKind: "comment",
      post: { offset: 0, page },
      unresolvedOnly: payload.unresolved_only,
    };
  }

  try {
    if (
      payload.page_cursor.length > 2_048 ||
      !payload.page_cursor.startsWith(REPORT_CURSOR_PREFIX)
    )
      throw new Error("invalid prefix");

    const raw: unknown = JSON.parse(
      decodeURIComponent(
        payload.page_cursor.slice(REPORT_CURSOR_PREFIX.length),
      ),
    );
    if (!raw || typeof raw !== "object") throw new Error("invalid object");

    const serialized = raw as Partial<SerializedReportCursor>;
    if (
      !isPositiveInteger(serialized.b) ||
      !isReportSourceCursor(serialized.c) ||
      !(serialized.n === "c" || serialized.n === "p") ||
      !isReportSourceCursor(serialized.p) ||
      !(
        serialized.ci === null ||
        (typeof serialized.ci === "number" && Number.isInteger(serialized.ci))
      ) ||
      !(serialized.u === null || typeof serialized.u === "boolean")
    )
      throw new Error("invalid fields");

    const state = {
      batchSize: serialized.b,
      comment: toReportSourceCursor(serialized.c),
      communityId: serialized.ci ?? undefined,
      nextKind: serialized.n === "c" ? "comment" : "post",
      post: toReportSourceCursor(serialized.p),
      unresolvedOnly: serialized.u ?? undefined,
    } satisfies ReportCursorState;

    if (
      state.communityId !== payload.community_id ||
      state.unresolvedOnly !== payload.unresolved_only
    )
      throw new Error("filter mismatch");

    return state;
  } catch {
    throw new InvalidPayloadError("Invalid PieFed report page cursor");
  }
}

function encodeModlogCursor(state: ModlogCursorState): string {
  const serialized = {
    b: state.batchSize,
    f: [
      state.filters.comment_id ?? null,
      state.filters.community_id ?? null,
      state.filters.mod_person_id ?? null,
      state.filters.other_person_id ?? null,
      state.filters.post_id ?? null,
    ],
    s: MODLOG_BUCKETS.map((bucket) => {
      const source = state.sources[bucket];
      return source ? ([source.page, source.offset] as const) : null;
    }),
  } satisfies SerializedModlogCursor;

  const encoded = encodeURIComponent(JSON.stringify(serialized));
  return `${MODLOG_CURSOR_PREFIX}${encoded}.${modlogCursorChecksum(encoded)}`;
}

function encodeReportCursor(state: ReportCursorState): string {
  const serialized = {
    b: state.batchSize,
    c: fromReportSourceCursor(state.comment),
    ci: state.communityId ?? null,
    n: state.nextKind === "comment" ? "c" : "p",
    p: fromReportSourceCursor(state.post),
    u: state.unresolvedOnly ?? null,
  } satisfies SerializedReportCursor;

  return `${REPORT_CURSOR_PREFIX}${encodeURIComponent(JSON.stringify(serialized))}`;
}

async function ensureModlogHead(
  state: ModlogCursorState,
  bucket: PiefedModlogBucket,
  load: (
    bucket: PiefedModlogBucket,
    page: number,
  ) => Promise<types.ModlogItem[]>,
): Promise<types.ModlogItem | undefined> {
  while (state.sources[bucket]) {
    const cursor = state.sources[bucket]!;
    const items = await load(bucket, cursor.page);

    if (cursor.offset < items.length) return items[cursor.offset];

    if (items.length < state.batchSize) {
      state.sources[bucket] = null;
      return undefined;
    }

    const nextPage = cursor.page + 1;
    if (!isPositiveInteger(nextPage))
      throw new UnexpectedResponseError(
        "PieFed modlog exceeded the safe page range",
      );
    state.sources[bucket] = { offset: 0, page: nextPage };
  }

  return undefined;
}

async function ensureReportHead<T>(
  buffer: ReportPageBuffer<T>,
  load: (page: number) => Promise<{ items: T[]; nextPage?: number }>,
): Promise<T | undefined> {
  while (buffer.cursor) {
    if (!buffer.loaded) {
      const page = await load(buffer.cursor.page);
      buffer.items = page.items;
      buffer.loaded = true;
      buffer.nextPage = page.nextPage;
    }

    if (buffer.cursor.offset < buffer.items.length)
      return buffer.items[buffer.cursor.offset];

    // Match the canonical page-number behavior: an actually empty server
    // page terminates even if it hands out a bogus cursor.
    if (buffer.items.length === 0) {
      buffer.cursor = null;
      return undefined;
    }

    advanceReportBuffer(buffer);
  }

  return undefined;
}

function fromReportSourceCursor(
  cursor: null | ReportSourceCursor,
): [number, number] | null {
  return cursor ? [cursor.page, cursor.offset] : null;
}

function isModlogSourceCursor(
  value: unknown,
  batchSize: number | undefined,
): value is [number, number] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.length === 2 &&
      isPositiveInteger(value[0]) &&
      typeof value[1] === "number" &&
      Number.isSafeInteger(value[1]) &&
      value[1] >= 0 &&
      batchSize !== undefined &&
      value[1] < batchSize)
  );
}

function isNullablePositiveInteger(value: unknown): value is null | number {
  return value === null || isPositiveInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value < Number.MAX_SAFE_INTEGER
  );
}

function isReportSourceCursor(
  value: unknown,
): value is [number, number] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.length === 2 &&
      isPositiveInteger(value[0]) &&
      typeof value[1] === "number" &&
      Number.isSafeInteger(value[1]) &&
      value[1] >= 0)
  );
}

function modlogCursorChecksum(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(36).padStart(7, "0");
}

function modlogFiltersEqual(
  left: ModlogCursorFilters,
  right: ModlogCursorFilters,
): boolean {
  return (
    left.comment_id === right.comment_id &&
    left.community_id === right.community_id &&
    left.mod_person_id === right.mod_person_id &&
    left.other_person_id === right.other_person_id &&
    left.post_id === right.post_id
  );
}

function modlogSourcesAtPage(page: number): ModlogCursorState["sources"] {
  const sources = {} as ModlogCursorState["sources"];
  for (const bucket of MODLOG_BUCKETS) sources[bucket] = { offset: 0, page };
  return sources;
}

function reportPublishedAt(
  report: PiefedCommentReportView | PiefedPostReportView,
): number | undefined {
  const published =
    "comment_report" in report
      ? report.comment_report.published
      : report.post_report.published;
  if (!published) return undefined;

  const timestamp = Date.parse(published);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function sortReportPage<
  T extends PiefedCommentReportView | PiefedPostReportView,
>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftPublished = reportPublishedAt(left);
    const rightPublished = reportPublishedAt(right);

    if (
      leftPublished !== undefined &&
      rightPublished !== undefined &&
      leftPublished !== rightPublished
    )
      return rightPublished - leftPublished;

    const leftId =
      "comment_report" in left ? left.comment_report.id : left.post_report.id;
    const rightId =
      "comment_report" in right
        ? right.comment_report.id
        : right.post_report.id;
    return rightId - leftId;
  });
}

function takeReportHead<T>(buffer: ReportPageBuffer<T>): T {
  const cursor = buffer.cursor;
  if (!cursor || !buffer.loaded)
    throw new Error("Cannot consume an unloaded report page");

  const item = buffer.items[cursor.offset]!;
  cursor.offset += 1;

  if (cursor.offset >= buffer.items.length) advanceReportBuffer(buffer);

  return item;
}

function toModlogCursorFilters(
  payload: Parameters<BaseClient["getModlog"]>[0],
): ModlogCursorFilters {
  return {
    comment_id: payload.comment_id,
    community_id: payload.community_id,
    mod_person_id: payload.mod_person_id,
    other_person_id: payload.other_person_id,
    post_id: payload.post_id,
  };
}

function toModlogSourceCursor(
  serialized: [number, number] | null,
): ModlogSourceCursor | null {
  return serialized ? { offset: serialized[1], page: serialized[0] } : null;
}

function toReportSourceCursor(
  serialized: [number, number] | null,
): null | ReportSourceCursor {
  return serialized ? { offset: serialized[1], page: serialized[0] } : null;
}

function toScore(is_upvote: boolean | undefined): number {
  if (is_upvote === true) return 1;
  if (is_upvote === false) return -1;
  return 0;
}

function toServerReportPage(nextPage: null | string | undefined) {
  if (nextPage == null) return undefined;

  const page = Number(nextPage);
  return isPositiveInteger(page) ? page : undefined;
}

function validateModlogLimit(limit: number | undefined): number | undefined {
  if (limit !== undefined && !isPositiveInteger(limit))
    throw new InvalidPayloadError(
      "PieFed modlog limit must be a positive integer",
    );

  return limit;
}

function validateReportLimit(limit: number | undefined): number | undefined {
  if (limit !== undefined && !isPositiveInteger(limit))
    throw new InvalidPayloadError(
      "PieFed report limit must be a positive integer",
    );

  return limit;
}

export default buildSafeClient(UnsafePiefedClient);
