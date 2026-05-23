import * as LemmyV0 from "lemmy-js-client-v0";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  InvalidPayloadError,
  LemmyResponseError,
  UnexpectedResponseError,
  UnsupportedError,
} from "../../errors";
import { cleanThreadiverseParams } from "../../helpers";
import buildSafeClient from "../../SafeClient";
import * as types from "../../types";
import { ListPersonLikedResponse } from "../../types";
import * as compat from "./compat";
import {
  getLogDate,
  getPostCommentItemCreatedDate,
  sortPostCommentByPublished,
} from "./helpers";

export class UnsafeLemmyV0Client implements BaseClient {
  static mode = "lemmyv0" as const;

  static softwareName = "lemmy" as const;

  static softwareVersionRange = ">=0.19.0";

  #client: LemmyV0.LemmyHttp;

  constructor(hostname: string, options: BaseClientOptions) {
    this.#client = wrapLemmyV0Errors(new LemmyV0.LemmyHttp(hostname, options));
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["banFromCommunity"]> {
    const { expires_at, ...rest } = payload;
    await this.#client.banFromCommunity(
      { ...rest, expires: expires_at },
      options,
    );
  }

  async blockCommunity(
    ...params: Parameters<BaseClient["blockCommunity"]>
  ): ReturnType<BaseClient["blockCommunity"]> {
    const response = await this.#client.blockCommunity(...params);

    return {
      ...response,
      community_view: compat.toCommunityView(response.community_view),
    };
  }

  async blockInstance(
    ...params: Parameters<BaseClient["blockInstance"]>
  ): ReturnType<BaseClient["blockInstance"]> {
    await this.#client.blockInstance(...params);
  }

  async blockPerson(
    ...params: Parameters<BaseClient["blockPerson"]>
  ): ReturnType<BaseClient["blockPerson"]> {
    const response = await this.#client.blockPerson(...params);

    return {
      person_view: compat.toPersonView(response.person_view),
    };
  }

  async createComment(
    ...params: Parameters<BaseClient["createComment"]>
  ): ReturnType<BaseClient["createComment"]> {
    const response = await this.#client.createComment(...params);

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async createCommentReport(
    ...params: Parameters<BaseClient["createCommentReport"]>
  ): ReturnType<BaseClient["createCommentReport"]> {
    await this.#client.createCommentReport(...params);
  }

  async createPost(
    ...params: Parameters<BaseClient["createPost"]>
  ): ReturnType<BaseClient["createPost"]> {
    const response = await this.#client.createPost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async createPostReport(
    ...params: Parameters<BaseClient["createPostReport"]>
  ): ReturnType<BaseClient["createPostReport"]> {
    await this.#client.createPostReport(...params);
  }

  async createPrivateMessage(
    ...params: Parameters<BaseClient["createPrivateMessage"]>
  ): ReturnType<BaseClient["createPrivateMessage"]> {
    const response = await this.#client.createPrivateMessage(...params);

    return {
      private_message_view: compat.toPrivateMessageView(
        response.private_message_view,
      ),
    };
  }

  async createPrivateMessageReport(
    ...params: Parameters<BaseClient["createPrivateMessageReport"]>
  ): ReturnType<BaseClient["createPrivateMessageReport"]> {
    await this.#client.createPrivateMessageReport(...params);
  }

  async deleteComment(
    ...params: Parameters<BaseClient["deleteComment"]>
  ): ReturnType<BaseClient["deleteComment"]> {
    const response = await this.#client.deleteComment(...params);

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async deleteImage(
    payload: Parameters<BaseClient["deleteImage"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["deleteImage"]> {
    await this.#client.deleteImage(
      {
        filename: new URL(payload.url).pathname.split("/").pop()!,
        token: payload.delete_token,
      },
      options,
    );
  }

  async deletePost(
    ...params: Parameters<BaseClient["deletePost"]>
  ): ReturnType<BaseClient["deletePost"]> {
    const response = await this.#client.deletePost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async distinguishComment(
    ...params: Parameters<BaseClient["distinguishComment"]>
  ): ReturnType<BaseClient["distinguishComment"]> {
    const response = await this.#client.distinguishComment(...params);

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async editComment(
    ...params: Parameters<BaseClient["editComment"]>
  ): ReturnType<BaseClient["editComment"]> {
    const response = await this.#client.editComment(...params);

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async editPost(
    ...params: Parameters<BaseClient["editPost"]>
  ): ReturnType<BaseClient["editPost"]> {
    const response = await this.#client.editPost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async featurePost(
    payload: Parameters<BaseClient["featurePost"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["featurePost"]> {
    const response = await this.#client.featurePost(
      {
        ...payload,
        feature_type:
          payload.feature_type === "community" ? "Community" : "Local",
      },
      options,
    );

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async followCommunity(
    ...params: Parameters<BaseClient["followCommunity"]>
  ): ReturnType<BaseClient["followCommunity"]> {
    const response = await this.#client.followCommunity(...params);

    return {
      ...response,
      community_view: compat.toCommunityView(response.community_view),
    };
  }

  async getCaptcha(
    ...params: Parameters<BaseClient["getCaptcha"]>
  ): ReturnType<BaseClient["getCaptcha"]> {
    return this.#client.getCaptcha(...params);
  }

  async getComments(
    payload: Parameters<BaseClient["getComments"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getComments"]> {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const { type_, ...rest } = compat.fromPageParams(payload);

    const response = await this.#client.getComments(
      {
        ...rest,
        type_: compat.fromListingType(type_),
      },
      options,
    );

    return {
      ...compat.toPageResponse(payload),
      data: response.comments.map(compat.toCommentView),
    };
  }

  async getCommunity(
    ...params: Parameters<BaseClient["getCommunity"]>
  ): ReturnType<BaseClient["getCommunity"]> {
    const response = await this.#client.getCommunity(...params);

    return {
      ...response,
      community_view: {
        ...compat.toCommunityView(response.community_view),
      },
      moderators: response.moderators.map(compat.toCommunityModeratorView),
    };
  }

  async getFederatedInstances(
    ...params: Parameters<BaseClient["getFederatedInstances"]>
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.#client.getFederatedInstances(...params);

    if (!response.federated_instances)
      return { federated_instances: undefined };

    return {
      federated_instances: {
        allowed: response.federated_instances.allowed.map(
          compat.toInstanceWithFederationState,
        ),
        blocked: response.federated_instances.blocked.map(
          compat.toInstanceWithFederationState,
        ),
        linked: response.federated_instances.linked.map(
          compat.toInstanceWithFederationState,
        ),
      },
    };
  }

  async getModlog(
    payload: Parameters<BaseClient["getModlog"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getModlog"]> {
    const response = await this.#client.getModlog(
      compat.fromPageParams(payload),
      options,
    );

    return {
      ...compat.toPageResponse(payload),
      data: Object.values(response)
        .flat()
        .map(compat.toModlogView)
        .filter((m) => !!m)
        .sort((a, b) => Date.parse(getLogDate(b)) - Date.parse(getLogDate(a))),
    };
  }

  async getNotifications(
    payload: Parameters<BaseClient["getNotifications"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getNotifications"]> {
    const { type_ } = payload;
    const params = compat.fromPageParams(payload);

    const fetchReplies = async (): Promise<types.NotificationView[]> => {
      const res = await this.#client.getReplies(
        { ...params, sort: "New" },
        options,
      );
      return res.replies.map(compat.toReplyNotificationView);
    };
    const fetchMentions = async (): Promise<types.NotificationView[]> => {
      const res = await this.#client.getPersonMentions(
        { ...params, sort: "New" },
        options,
      );
      return res.mentions.map(compat.toMentionNotificationView);
    };
    const fetchMessages = async (): Promise<types.NotificationView[]> => {
      const res = await this.#client.getPrivateMessages(params, options);
      return res.private_messages.map(compat.toPrivateMessageNotificationView);
    };

    let data: types.NotificationView[];
    switch (type_) {
      case "all":
      case undefined: {
        const [replies, mentions, messages] = await Promise.all([
          fetchReplies(),
          fetchMentions(),
          fetchMessages(),
        ]);
        data = [...replies, ...mentions, ...messages].sort(
          (a, b) =>
            Date.parse(b.notification.published_at) -
            Date.parse(a.notification.published_at),
        );
        break;
      }
      case "mention":
        data = await fetchMentions();
        break;
      case "mod_action":
      case "subscribed":
        data = [];
        break;
      case "private_message":
        data = await fetchMessages();
        break;
      case "reply":
        data = await fetchReplies();
        break;
    }

    return {
      ...compat.toPageResponse(payload),
      data,
    };
  }

  async getPersonDetails(
    payload: Parameters<BaseClient["getPersonDetails"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPersonDetails"]> {
    const response = await this.#client.getPersonDetails(
      {
        ...payload,
        limit: 1, // Lemmy melts down if limit is 0
      },
      options,
    );

    return {
      moderates: response.moderates.map(compat.toCommunityModeratorView),
      person_view: compat.toPersonView(response.person_view),
    };
  }

  async getPost(
    ...params: Parameters<BaseClient["getPost"]>
  ): ReturnType<BaseClient["getPost"]> {
    const response = await this.#client.getPost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPosts"]> {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const page_cursor = payload.page_cursor;
    if (typeof page_cursor === "number")
      throw new InvalidPayloadError("page_cursor must be string");

    const { type_, ...rest } = cleanThreadiverseParams(payload);

    const response = await this.#client.getPosts(
      {
        // Only endpoint in lemmy v0 that supports page_cursor
        // Do not call fromPageParams here!
        ...rest,
        page_cursor,
        type_: compat.fromListingType(type_),
      },
      options,
    );

    return {
      data: response.posts.map(compat.toPostView),
      next_page: response.next_page,
    };
  }

  async getPostSortType() {
    return [{ sort: "Top" }, { sort: "All" }] as const;
  }

  async getRandomCommunity(
    ..._params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    throw new UnsupportedError(
      "Get random community is not supported by Lemmy v0",
    );
  }

  async getSite(
    ...params: Parameters<BaseClient["getSite"]>
  ): ReturnType<BaseClient["getSite"]> {
    const site = await this.#client.getSite(...params);

    return {
      admins: site.admins.map(compat.toPersonView),
      my_user: site.my_user
        ? {
            follows: site.my_user.follows.map(compat.toCommunityFollowerView),
            local_user_view: {
              local_user: {
                admin: site.my_user.local_user_view.local_user.admin,
                show_nsfw: site.my_user.local_user_view.local_user.show_nsfw,
              },
              person: compat.toPerson(
                site.my_user.local_user_view.person,
                site.my_user.local_user_view.counts,
              ),
            },
            moderates: site.my_user.moderates.map(
              compat.toCommunityModeratorView,
            ),
            ...compat.toBlocks(site.my_user),
          }
        : undefined,
      site_view: {
        local_site: compat.toLocalSite(
          site.site_view.local_site,
          site.site_view.counts,
        ),
        site: compat.toSite(site.site_view.site),
      },
      version: site.version,
    };
  }

  async getSiteMetadata(
    ...params: Parameters<BaseClient["getSiteMetadata"]>
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    return this.#client.getSiteMetadata(...params);
  }

  async getUnreadCount(
    ...params: Parameters<BaseClient["getUnreadCount"]>
  ): ReturnType<BaseClient["getUnreadCount"]> {
    return this.#client.getUnreadCount(...params);
  }

  async likeComment(
    payload: Parameters<BaseClient["likeComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["likeComment"]> {
    const response = await this.#client.likeComment(
      { comment_id: payload.comment_id, score: toScore(payload.is_upvote) },
      options,
    );

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async likePost(
    payload: Parameters<BaseClient["likePost"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["likePost"]> {
    const response = await this.#client.likePost(
      { post_id: payload.post_id, score: toScore(payload.is_upvote) },
      options,
    );

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async listCommentReports(
    payload: Parameters<BaseClient["listCommentReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommentReports"]> {
    const response = await this.#client.listCommentReports(
      compat.fromPageParams(payload),
      options,
    );

    return {
      ...compat.toPageResponse(payload),
      data: response.comment_reports.map(compat.toCommentReportView),
    };
  }

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommunities"]> {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const { type_, ...rest } = compat.fromPageParams(payload);

    const response = await this.#client.listCommunities(
      {
        ...rest,
        type_: compat.fromListingType(type_),
      },
      options,
    );

    return {
      ...compat.toPageResponse(payload),
      data: response.communities.map(compat.toCommunityView),
    };
  }

  async listPersonContent(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonContent"]> {
    const response = await this.#client.getPersonDetails(
      {
        ...compat.fromPageParams(payload),
        sort: "New",
      },
      options,
    );

    const data = (() => {
      switch (payload.type) {
        case "all":
        case undefined:
          return [
            ...response.posts.map(compat.toPostView),
            ...response.comments.map(compat.toCommentView),
          ].sort(
            (a, b) =>
              getPostCommentItemCreatedDate(b) -
              getPostCommentItemCreatedDate(a),
          );
        case "comments":
          return response.comments.map(compat.toCommentView);
        case "posts":
          return response.posts.map(compat.toPostView);
      }
    })();

    return {
      ...compat.toPageResponse(payload),
      data,
    };
  }

  async listPersonLiked(
    { like_type, ...payload }: Parameters<BaseClient["listPersonLiked"]>[0],
    options?: RequestOptions,
  ): Promise<ListPersonLikedResponse> {
    const v0Payload: LemmyV0.GetComments & LemmyV0.GetPosts = {
      ...compat.fromPageParams(payload),
      disliked_only: like_type === "disliked_only",
      liked_only: like_type === "liked_only",
      show_read: true,
    };

    const [{ posts }, { comments }] = await Promise.all([
      this.#client.getPosts(v0Payload, options),
      this.#client.getComments(v0Payload, options),
    ]);

    return {
      data: [
        ...comments.map(compat.toCommentView),
        ...posts.map(compat.toPostView),
      ].sort(sortPostCommentByPublished),
      ...compat.toPageResponse(payload),
    };
  }

  async listPersonSaved(
    payload: Parameters<BaseClient["listPersonSaved"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonSaved"]> {
    return this.listPersonContent(
      {
        ...payload,
        // @ts-expect-error Dogfood the api
        saved_only: true,
      },
      options,
    );
  }

  async listPostReports(
    payload: Parameters<BaseClient["listPostReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPostReports"]> {
    const response = await this.#client.listPostReports(
      compat.fromPageParams(payload),
      options,
    );

    return {
      ...compat.toPageResponse(payload),
      data: response.post_reports.map(compat.toPostReportView),
    };
  }

  async listReports(
    payload: Parameters<BaseClient["listReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listReports"]> {
    const params = compat.fromPageParams(payload);

    const [{ comment_reports }, { post_reports }] = await Promise.all([
      this.#client.listCommentReports(params, options),
      this.#client.listPostReports(params, options),
    ]);

    return {
      ...compat.toPageResponse(payload),
      data: [
        ...comment_reports.map(compat.toCommentReportView),
        ...post_reports.map(compat.toPostReportView),
      ].sort(
        (a, b) =>
          getPostCommentItemCreatedDate(b) - getPostCommentItemCreatedDate(a),
      ),
    };
  }

  async lockPost(
    ...params: Parameters<BaseClient["lockPost"]>
  ): ReturnType<BaseClient["lockPost"]> {
    const response = await this.#client.lockPost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async login(
    ...params: Parameters<BaseClient["login"]>
  ): ReturnType<BaseClient["login"]> {
    return this.#client.login(...params);
  }

  async logout(
    ...params: Parameters<BaseClient["logout"]>
  ): ReturnType<BaseClient["logout"]> {
    await this.#client.logout(...params);
  }

  async markAllAsRead(
    ...params: Parameters<BaseClient["markAllAsRead"]>
  ): ReturnType<BaseClient["markAllAsRead"]> {
    await this.#client.markAllAsRead(...params);
  }

  async markNotificationAsRead(
    payload: Parameters<BaseClient["markNotificationAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markNotificationAsRead"]> {
    const { notification, read } = payload;
    switch (notification.kind) {
      case "mention":
        await this.#client.markPersonMentionAsRead(
          { person_mention_id: notification.id, read },
          options,
        );
        return;
      case "mod_action":
      case "subscribed":
        return;
      case "private_message":
        await this.#client.markPrivateMessageAsRead(
          { private_message_id: notification.id, read },
          options,
        );
        return;
      case "reply":
        await this.#client.markCommentReplyAsRead(
          { comment_reply_id: notification.id, read },
          options,
        );
        return;
    }
  }

  async markPostAsRead(
    ...params: Parameters<BaseClient["markPostAsRead"]>
  ): ReturnType<BaseClient["markPostAsRead"]> {
    await this.#client.markPostAsRead(...params);
  }

  async register(
    ...params: Parameters<BaseClient["register"]>
  ): ReturnType<BaseClient["register"]> {
    return this.#client.register(...params);
  }

  async removeComment(
    ...params: Parameters<BaseClient["removeComment"]>
  ): ReturnType<BaseClient["removeComment"]> {
    const response = await this.#client.removeComment(...params);

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async removePost(
    ...params: Parameters<BaseClient["removePost"]>
  ): ReturnType<BaseClient["removePost"]> {
    const response = await this.#client.removePost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async resolveCommentReport(
    ...params: Parameters<BaseClient["resolveCommentReport"]>
  ): ReturnType<BaseClient["resolveCommentReport"]> {
    await this.#client.resolveCommentReport(...params);
  }

  async resolveObject(
    payload: Parameters<BaseClient["resolveObject"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["resolveObject"]> {
    const response = await this.#client.resolveObject(payload, options);

    return {
      comment: response.comment
        ? compat.toCommentView(response.comment)
        : undefined,
      community: response.community
        ? compat.toCommunityView(response.community)
        : undefined,
      person: response.person
        ? compat.toPersonView(response.person)
        : undefined,
      post: response.post ? compat.toPostView(response.post) : undefined,
    };
  }

  async resolvePostReport(
    ...params: Parameters<BaseClient["resolvePostReport"]>
  ): ReturnType<BaseClient["resolvePostReport"]> {
    await this.#client.resolvePostReport(...params);
  }

  async saveComment(
    ...params: Parameters<BaseClient["saveComment"]>
  ): ReturnType<BaseClient["saveComment"]> {
    const response = await this.#client.saveComment(...params);

    return {
      comment_view: compat.toCommentView(response.comment_view),
    };
  }

  async savePost(
    ...params: Parameters<BaseClient["savePost"]>
  ): ReturnType<BaseClient["savePost"]> {
    const response = await this.#client.savePost(...params);

    return {
      post_view: compat.toPostView(response.post_view),
    };
  }

  async saveUserSettings(
    ...params: Parameters<BaseClient["saveUserSettings"]>
  ): ReturnType<BaseClient["saveUserSettings"]> {
    await this.#client.saveUserSettings(...params);
  }

  async search(
    payload: Parameters<BaseClient["search"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["search"]> {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const { listing_type, search_term, type_, ...rest } =
      compat.fromPageParams(payload);

    const response = await this.#client.search(
      {
        ...rest,
        listing_type: compat.fromListingType(listing_type),
        q: search_term,
        type_: compat.fromSearchType(type_),
      },
      options,
    );

    return {
      ...compat.toPageResponse(payload),
      data: [
        ...response.comments.map(compat.toCommentView),
        ...response.posts.map(compat.toPostView),
        ...response.communities.map(compat.toCommunityView),
        ...response.users.map(compat.toPersonView),
      ],
    };
  }

  async uploadImage(
    ...params: Parameters<BaseClient["uploadImage"]>
  ): ReturnType<BaseClient["uploadImage"]> {
    const response = await this.#client.uploadImage(...params);

    const fileResponse = response.files?.[0];

    if (!fileResponse || !response.url) {
      throw new UnexpectedResponseError("Failed to upload image");
    }

    return {
      delete_token: fileResponse.delete_token,
      url: response.url,
    };
  }
}

/**
 * v0 uses a tri-state `score: 1 | 0 | -1`; threadiverse exposes v1's
 * `is_upvote?: boolean` (true=upvote, false=downvote, undefined=clear).
 */
function toScore(is_upvote: boolean | undefined): number {
  if (is_upvote === true) return 1;
  if (is_upvote === false) return -1;
  return 0;
}

/**
 * Wrap every method on the lemmy-js-client-v0 instance so that any thrown
 * `Error` (whose `.message` carries the server error code) becomes a
 * `LemmyResponseError`. Consumers can then `instanceof LemmyResponseError`
 * uniformly across v0 and v1, and the original error is preserved as `.cause`.
 */
function wrapLemmyV0Errors(client: LemmyV0.LemmyHttp): LemmyV0.LemmyHttp {
  // The v0 client throws `new Error(json.error ?? statusText)` for server
  // error responses — i.e. plain `Error`, not a subclass. Transport-level
  // failures (e.g. `TypeError("Failed to fetch")` from the network) bubble up
  // as their own subclass and should NOT be coerced into `LemmyResponseError`,
  // which is reserved for actual server responses.
  function normalize(err: unknown): never {
    if (
      err instanceof Error &&
      err.constructor === Error &&
      !(err instanceof LemmyResponseError) &&
      err.message
    ) {
      throw new LemmyResponseError(err.message, { cause: err });
    }
    throw err;
  }
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = Reflect.apply(value, target, args);
        return result instanceof Promise ? result.catch(normalize) : result;
      };
    },
  });
}

export default buildSafeClient(UnsafeLemmyV0Client);
