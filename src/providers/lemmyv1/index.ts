import type { RequestState } from "lemmy-js-client-v1";

import * as LemmyV1 from "lemmy-js-client-v1";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  InvalidPayloadError,
  LemmyResponseError,
  UnsupportedError,
} from "../../errors";
import buildSafeClient from "../../SafeClient";
import * as compat from "./compat";
import { isPostCommentReport } from "./helpers";

const DEFAULT_REASON = "None";

export class UnsafeLemmyV1Client implements BaseClient {
  static mode = "lemmyv1" as const;

  static softwareName = "lemmy" as const;

  static softwareVersionRange = ">=1.0.0-alpha.5 <2.0.0";

  #client: LemmyV1.LemmyHttp;
  #hasAuth: boolean;

  constructor(hostname: string, options: BaseClientOptions) {
    this.#client = new LemmyV1.LemmyHttp(hostname, options);
    this.#hasAuth = !!options.headers?.["Authorization"];
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["banFromCommunity"]> {
    await unwrap(
      await this.#client.banFromCommunity(
        {
          ...payload,
          reason: payload.reason ?? DEFAULT_REASON,
        },
        options
      )
    );
  }

  async blockCommunity(
    ...params: Parameters<BaseClient["blockCommunity"]>
  ): ReturnType<BaseClient["blockCommunity"]> {
    const response = unwrap(await this.#client.blockCommunity(...params));

    return {
      community_view: compat.toCommunityView(response.community_view),
    };
  }

  async blockInstance(
    ...params: Parameters<BaseClient["blockInstance"]>
  ): ReturnType<BaseClient["blockInstance"]> {
    // v1 split instance blocks into community-side and person-side. Block both
    // so the threadiverse `blockInstance` semantic ("block all content from
    // this instance") matches v0's behavior.
    const [communities, persons] = await Promise.all([
      this.#client.userBlockInstanceCommunities(...params),
      this.#client.userBlockInstancePersons(...params),
    ]);
    unwrap(communities);
    unwrap(persons);
  }

  async blockPerson(
    ...params: Parameters<BaseClient["blockPerson"]>
  ): ReturnType<BaseClient["blockPerson"]> {
    const response = unwrap(await this.#client.blockPerson(...params));

    return {
      person_view: compat.toPersonView(response.person_view),
    };
  }

  async createComment(
    ...params: Parameters<BaseClient["createComment"]>
  ): ReturnType<BaseClient["createComment"]> {
    const response = unwrap(await this.#client.createComment(...params));

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async createCommentReport(
    ...params: Parameters<BaseClient["createCommentReport"]>
  ): ReturnType<BaseClient["createCommentReport"]> {
    await unwrap(await this.#client.createCommentReport(...params));
  }

  async createPost(
    ...params: Parameters<BaseClient["createPost"]>
  ): ReturnType<BaseClient["createPost"]> {
    const response = unwrap(await this.#client.createPost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async createPostReport(
    ...params: Parameters<BaseClient["createPostReport"]>
  ): ReturnType<BaseClient["createPostReport"]> {
    await unwrap(await this.#client.createPostReport(...params));
  }

  async createPrivateMessage(
    ...params: Parameters<BaseClient["createPrivateMessage"]>
  ): ReturnType<BaseClient["createPrivateMessage"]> {
    const response = unwrap(await this.#client.createPrivateMessage(...params));

    return {
      private_message_view: compat.toPrivateMessageView(
        response.private_message_view
      ),
    };
  }

  async createPrivateMessageReport(
    ...params: Parameters<BaseClient["createPrivateMessageReport"]>
  ): ReturnType<BaseClient["createPrivateMessageReport"]> {
    await unwrap(await this.#client.createPrivateMessageReport(...params));
  }

  async deleteComment(
    ...params: Parameters<BaseClient["deleteComment"]>
  ): ReturnType<BaseClient["deleteComment"]> {
    const response = unwrap(await this.#client.deleteComment(...params));

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async deleteImage(
    payload: Parameters<BaseClient["deleteImage"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["deleteImage"]> {
    await unwrap(
      await this.#client.deleteMedia(
        { filename: payload.url }, // delete_token is not needed. Lemmy verifies account ownership
        options
      )
    );
  }

  async deletePost(
    ...params: Parameters<BaseClient["deletePost"]>
  ): ReturnType<BaseClient["deletePost"]> {
    const response = unwrap(await this.#client.deletePost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async distinguishComment(
    ...params: Parameters<BaseClient["distinguishComment"]>
  ): ReturnType<BaseClient["distinguishComment"]> {
    const response = unwrap(await this.#client.distinguishComment(...params));

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async editComment(
    ...params: Parameters<BaseClient["editComment"]>
  ): ReturnType<BaseClient["editComment"]> {
    const response = unwrap(await this.#client.editComment(...params));

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async editPost(
    ...params: Parameters<BaseClient["editPost"]>
  ): ReturnType<BaseClient["editPost"]> {
    const response = unwrap(await this.#client.editPost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async featurePost(
    ...params: Parameters<BaseClient["featurePost"]>
  ): ReturnType<BaseClient["featurePost"]> {
    const response = unwrap(await this.#client.featurePost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async followCommunity(
    ...params: Parameters<BaseClient["followCommunity"]>
  ): ReturnType<BaseClient["followCommunity"]> {
    const response = unwrap(await this.#client.followCommunity(...params));

    return {
      community_view: compat.toCommunityView(response.community_view),
    };
  }

  async getCaptcha(
    ...params: Parameters<BaseClient["getCaptcha"]>
  ): ReturnType<BaseClient["getCaptcha"]> {
    return unwrap(await this.#client.getCaptcha(...params));
  }

  async getComments(
    payload: Parameters<BaseClient["getComments"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["getComments"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`
      );

    const response = unwrap(
      await this.#client.getComments(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items.map(compat.toCommentView),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async getCommunity(
    ...params: Parameters<BaseClient["getCommunity"]>
  ): ReturnType<BaseClient["getCommunity"]> {
    const response = unwrap(await this.#client.getCommunity(...params));

    return {
      ...response,
      community_view: compat.toCommunityView(response.community_view),
      moderators: response.moderators,
    };
  }

  async getFederatedInstances(
    _options?: RequestOptions
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    throw new UnsupportedError(
      "getFederatedInstances is not supported for Lemmy v1 (endpoint is now paginated)"
    );
  }

  async getModlog(
    payload: Parameters<BaseClient["getModlog"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["getModlog"]> {
    const response = unwrap(
      await this.#client.getModlog(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items.map(compat.toModlogView).filter((m) => !!m),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async getNotifications(
    payload: Parameters<BaseClient["getNotifications"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["getNotifications"]> {
    const response = unwrap(
      await this.#client.listNotifications(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items
        .map(compat.toSupportedNotificationView)
        .filter((r) => !!r),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async getPersonDetails(
    ...params: Parameters<BaseClient["getPersonDetails"]>
  ): ReturnType<BaseClient["getPersonDetails"]> {
    const response = unwrap(await this.#client.getPersonDetails(...params));

    return {
      ...response,
      moderates: response.moderates,
      person_view: compat.toPersonView(response.person_view),
    };
  }

  async getPost(
    ...params: Parameters<BaseClient["getPost"]>
  ): ReturnType<BaseClient["getPost"]> {
    const response = unwrap(await this.#client.getPost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["getPosts"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`
      );

    const response = unwrap(
      await this.#client.getPosts(compat.fromPageParams(payload), options)
    );

    return {
      data: response.items.map(compat.toPostView),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async getRandomCommunity(
    ...params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    const response = unwrap(await this.#client.getRandomCommunity(...params));
    return {
      community_view: compat.toCommunityView(response.community_view),
    };
  }

  async getSite(options?: RequestOptions): ReturnType<BaseClient["getSite"]> {
    const [siteResult, myUserResult] = await Promise.all([
      this.#client.getSite(options),
      this.#hasAuth ? this.#client.getMyUser(options) : null,
    ]);

    const siteResponse = unwrap(siteResult);
    const myUserInfo = myUserResult ? unwrap(myUserResult) : undefined;

    return {
      admins: siteResponse.admins.map(compat.toPersonView),
      my_user: myUserInfo ? compat.toMyUserInfo(myUserInfo) : undefined,
      site_view: compat.toSiteView(
        siteResponse.site_view,
        siteResponse.captcha_enabled
      ),
      version: siteResponse.version,
    };
  }

  async getSiteMetadata(
    ...params: Parameters<BaseClient["getSiteMetadata"]>
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    return unwrap(await this.#client.getSiteMetadata(...params));
  }

  async getUnreadCount(
    ...params: Parameters<BaseClient["getUnreadCount"]>
  ): ReturnType<BaseClient["getUnreadCount"]> {
    const response = unwrap(await this.#client.getUnreadCounts(...params));

    return {
      mentions: 0,
      private_messages: 0,
      replies: response.notification_count,
    };
  }

  async likeComment(
    ...params: Parameters<BaseClient["likeComment"]>
  ): ReturnType<BaseClient["likeComment"]> {
    const response = unwrap(await this.#client.likeComment(...params));

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async likePost(
    ...params: Parameters<BaseClient["likePost"]>
  ): ReturnType<BaseClient["likePost"]> {
    const response = unwrap(await this.#client.likePost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async listCommentReports(
    payload: Parameters<BaseClient["listCommentReports"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listCommentReports"]> {
    const response = unwrap(
      await this.#client.listReports(
        {
          ...compat.fromPageParams(payload),
          type_: "comments",
        },
        options
      )
    );

    return {
      data: response.items
        .filter(
          (r): r is LemmyV1.CommentReportView & { type_: "comment" } =>
            r.type_ === "comment"
        )
        .map(compat.toCommentReportView),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listCommunities"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`
      );

    const response = unwrap(
      await this.#client.listCommunities(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items.map(compat.toCommunityView),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async listPersonContent(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listPersonContent"]> {
    // Threadiverse exposes `type`; v1's wire schema is `type_` (Rust avoids
    // the reserved word). Same lowercase string values.
    const { type, ...rest } = payload;
    const response = unwrap(
      await this.#client.listPersonContent(
        { ...compat.fromPageParams(rest), type_: type },
        options
      )
    );

    return {
      data: response.items.map((item) => {
        if (item.type_ === "comment") return compat.toCommentView(item);
        return compat.toPostView(item);
      }),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async listPersonLiked(
    payload: Parameters<BaseClient["listPersonLiked"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listPersonLiked"]> {
    const response = unwrap(
      await this.#client.listPersonLiked(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items.map((item) => {
        switch (item.type_) {
          case "comment":
            return compat.toCommentView(item);
          case "post":
            return compat.toPostView(item);
        }
      }),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async listPersonSaved(
    payload: Parameters<BaseClient["listPersonSaved"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listPersonSaved"]> {
    const response = unwrap(
      await this.#client.listPersonSaved(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items.map((item) => {
        if (item.type_ === "comment") return compat.toCommentView(item);
        return compat.toPostView(item);
      }),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async listPostReports(
    payload: Parameters<BaseClient["listPostReports"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listPostReports"]> {
    const response = unwrap(
      await this.#client.listReports(
        {
          ...compat.fromPageParams(payload),
          type_: "posts",
        },
        options
      )
    );

    return {
      data: response.items
        .filter(
          (r): r is LemmyV1.PostReportView & { type_: "post" } =>
            r.type_ === "post"
        )
        .map(compat.toPostReportView),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async listReports(
    payload: Parameters<BaseClient["listReports"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["listReports"]> {
    const response = unwrap(
      await this.#client.listReports(
        compat.fromPageParams(payload),
        options
      )
    );

    return {
      data: response.items.filter(isPostCommentReport).map(compat.toReportView),
      next_page: nullToUndefined(response.next_page),
      prev_page: nullToUndefined(response.prev_page),
    };
  }

  async lockPost(
    payload: Parameters<BaseClient["lockPost"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["lockPost"]> {
    const response = unwrap(
      await this.#client.lockPost(
        {
          ...payload,
          reason: DEFAULT_REASON,
        },
        options
      )
    );

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async login(
    ...params: Parameters<BaseClient["login"]>
  ): ReturnType<BaseClient["login"]> {
    return unwrap(await this.#client.login(...params));
  }

  async logout(
    ...params: Parameters<BaseClient["logout"]>
  ): ReturnType<BaseClient["logout"]> {
    await unwrap(await this.#client.logout(...params));
  }

  async markAllAsRead(
    ...params: Parameters<BaseClient["markAllAsRead"]>
  ): ReturnType<BaseClient["markAllAsRead"]> {
    await unwrap(await this.#client.markAllNotificationsAsRead(...params));
  }

  async markNotificationAsRead(
    payload: Parameters<BaseClient["markNotificationAsRead"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["markNotificationAsRead"]> {
    await unwrap(
      await this.#client.markNotificationAsRead(
        { notification_id: payload.notification.id, read: payload.read },
        options
      )
    );
  }

  async markPostAsRead(
    ...params: Parameters<BaseClient["markPostAsRead"]>
  ): ReturnType<BaseClient["markPostAsRead"]> {
    await unwrap(await this.#client.markManyPostAsRead(...params));
  }

  async register(
    ...params: Parameters<BaseClient["register"]>
  ): ReturnType<BaseClient["register"]> {
    return unwrap(await this.#client.register(...params));
  }

  async removeComment(
    payload: Parameters<BaseClient["removeComment"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["removeComment"]> {
    const response = unwrap(
      await this.#client.removeComment(
        {
          ...payload,
          reason: payload.reason ?? DEFAULT_REASON,
        },
        options
      )
    );

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async removePost(
    payload: Parameters<BaseClient["removePost"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["removePost"]> {
    const response = unwrap(
      await this.#client.removePost(
        {
          ...payload,
          reason: payload.reason ?? DEFAULT_REASON,
        },
        options
      )
    );

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async resolveCommentReport(
    ...params: Parameters<BaseClient["resolveCommentReport"]>
  ): ReturnType<BaseClient["resolveCommentReport"]> {
    await unwrap(await this.#client.resolveCommentReport(...params));
  }

  async resolveObject(
    payload: Parameters<BaseClient["resolveObject"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["resolveObject"]> {
    const result = unwrap(await this.#client.resolveObject(payload, options));

    const compatResponse: Awaited<ReturnType<BaseClient["resolveObject"]>> = {};

    if (!result) return compatResponse;

    switch (result.type_) {
      case "comment":
        compatResponse.comment = compat.toCommentView(result);
        break;
      case "community":
        compatResponse.community = compat.toCommunityView(result);
        break;
      case "person":
        compatResponse.person = compat.toPersonView(result);
        break;
      case "post":
        compatResponse.post = compat.toPostView(result);
        break;
      // multi_community: not supported
    }

    return compatResponse;
  }

  async resolvePostReport(
    ...params: Parameters<BaseClient["resolvePostReport"]>
  ): ReturnType<BaseClient["resolvePostReport"]> {
    await unwrap(await this.#client.resolvePostReport(...params));
  }

  async saveComment(
    ...params: Parameters<BaseClient["saveComment"]>
  ): ReturnType<BaseClient["saveComment"]> {
    const response = unwrap(await this.#client.saveComment(...params));

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async savePost(
    ...params: Parameters<BaseClient["savePost"]>
  ): ReturnType<BaseClient["savePost"]> {
    const response = unwrap(await this.#client.savePost(...params));

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async saveUserSettings(
    ...params: Parameters<BaseClient["saveUserSettings"]>
  ): ReturnType<BaseClient["saveUserSettings"]> {
    await unwrap(await this.#client.saveUserSettings(...params));
  }

  async search(
    payload: Parameters<BaseClient["search"]>[0],
    options?: RequestOptions
  ): ReturnType<BaseClient["search"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`
      );

    const fromPaged = compat.fromPageParams(payload);
    const result = unwrap(
      await this.#client.search(
        {
          community_id: payload.community_id,
          community_name: payload.community_name,
          creator_id: payload.creator_id,
          limit: payload.limit,
          listing_type: payload.listing_type,
          page_cursor: fromPaged.page_cursor,
          post_url_only: payload.post_url_only,
          search_term: payload.search_term,
          time_range_seconds:
            payload.mode === "lemmyv1" ? payload.time_range_seconds : undefined,
          title_only: payload.title_only,
          type_: payload.type_,
        },
        options
      )
    );

    return {
      data: [
        ...result.comments.map(compat.toCommentView),
        ...result.posts.map(compat.toPostView),
        ...result.communities.map(compat.toCommunityView),
        ...result.persons.map(compat.toPersonView),
      ],
      next_page: nullToUndefined(result.next_page),
      prev_page: nullToUndefined(result.prev_page),
    };
  }

  async uploadImage(
    ...params: Parameters<BaseClient["uploadImage"]>
  ): ReturnType<BaseClient["uploadImage"]> {
    const response = unwrap(await this.#client.uploadImage(...params));

    return {
      delete_token: "",
      url: response.image_url,
    };
  }
}

/**
 * Lemmy v1's `LemmyError` puts the machine-readable error code (e.g.
 * "too_many_requests") on `.name` and the human description on `.message`.
 * Threadiverse exposes the error code as `.message` (matching v0's behavior)
 * so consumer code can do uniform `error.message === "code"` matching across
 * providers. The original `LemmyError` is preserved on `.cause` if anyone
 * needs the human description.
 */
function normalizeError(err: unknown): unknown {
  // Only wrap errors from the server (`LemmyError` carries the response's
  // `error` code on `.name`). Transport-level errors (`TypeError` from
  // `fetch`, `AbortError`, etc.) must pass through unchanged — wrapping
  // them would mis-classify a network failure as a Lemmy error code.
  if (err instanceof LemmyV1.LemmyError) {
    return new LemmyResponseError(err.name, { cause: err, status: err.status });
  }
  return err;
}

function nullToUndefined<T>(value: null | T | undefined): T | undefined {
  return value ?? undefined;
}

function unwrap<T>(state: RequestState<T>): T {
  if (state.state === "success") return state.data;
  if (state.state === "failed") throw normalizeError(state.err);
  throw new Error(`Request ${state.state}`);
}

export default buildSafeClient(UnsafeLemmyV1Client);
