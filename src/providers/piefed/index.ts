import createClient, { Middleware } from "openapi-fetch";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import { InvalidPayloadError, UnsupportedError } from "../../errors";
import { cleanThreadiverseParams } from "../../helpers";
import buildSafeClient from "../../SafeClient";
import {
  ListPersonContent,
  ListPersonContentResponse,
  PostView,
} from "../../types";
import {
  getInboxItemPublished,
  getPostCommentItemCreatedDate,
} from "../lemmyv0/helpers";
import * as compat from "./compat";
import { components, paths } from "./schema";

async function validateResponse(response: Response) {
  if (!response.ok) {
    const data = await response.json();
    if ("error" in data && typeof data.error === "string") {
      throw new Error(data.error);
    }
  }
}

const piefedMiddleware: Middleware = {
  async onResponse({ response }) {
    await validateResponse(response);
  },
};

export class UnsafePiefedClient implements BaseClient {
  static mode = "piefed" as const;

  static softwareName = "piefed" as const;

  // Piefed is not versioned atm
  static softwareVersionRange = "*";

  #client: ReturnType<typeof createClient<paths>>;

  #customFetch: typeof fetch;
  #headers: Record<string, string> | undefined;
  #url: string;

  constructor(url: string, options: BaseClientOptions) {
    this.#customFetch = options.fetchFunction ?? globalThis.fetch;
    this.#url = url;

    const headers = options.headers?.Authorization
      ? {
          Authorization: options.headers?.Authorization,
        }
      : undefined;

    this.#headers = headers;

    this.#client = createClient({
      baseUrl: url,
      fetch: options.fetchFunction,
      // TODO: piefed doesn't allow CORS headers other than Authorization
      headers,
    });

    this.#client.use(piefedMiddleware);
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["banFromCommunity"]> {
    await this.#client.POST("/api/alpha/community/moderate/ban", {
      ...options,
      // @ts-expect-error TODO: fix this
      body: payload,
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
      body: { ...payload },
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
    ..._params: Parameters<BaseClient["createPrivateMessageReport"]>
  ): ReturnType<BaseClient["createPrivateMessageReport"]> {
    throw new UnsupportedError(
      "Create private message report is not supported by piefed",
    );
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
    ..._params: Parameters<BaseClient["deleteImage"]>
  ): ReturnType<BaseClient["deleteImage"]> {
    throw new UnsupportedError("Delete image is not supported by piefed");
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
    ..._params: Parameters<BaseClient["distinguishComment"]>
  ): ReturnType<BaseClient["distinguishComment"]> {
    throw new UnsupportedError(
      "Distinguish comment is not supported by piefed",
    );
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

  async featurePost(
    payload: Parameters<BaseClient["featurePost"]>[0],
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/api/alpha/post/feature", {
      ...options,
      body: { ...payload },
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

    const query = cleanThreadiverseParams(
      compat.fromPageParams(payload),
    ) satisfies paths["/api/alpha/comment/list"]["get"]["parameters"]["query"];

    const response = await this.#client.GET("/api/alpha/comment/list", {
      ...options,
      params: { query },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.comments.map(compat.toCommentView),
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
    ..._params: Parameters<BaseClient["getFederatedInstances"]>
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.#client.GET("/api/alpha/federated_instances");

    return response.data!;
  }

  async getModlog(
    ..._params: Parameters<BaseClient["getModlog"]>
  ): ReturnType<BaseClient["getModlog"]> {
    throw new UnsupportedError("Get modlog is not supported by piefed");
  }

  async getNotifications(
    ...params: Parameters<BaseClient["getNotifications"]>
  ): ReturnType<BaseClient["getNotifications"]> {
    const [replies, mentions, privateMessages] = await Promise.all([
      this.getReplies(...params),
      this.getPersonMentions(...params),
      this.getPrivateMessages(...params),
    ]);

    const data = [
      ...replies.data,
      ...mentions.data,
      ...privateMessages.data,
    ].sort(
      (a, b) =>
        Date.parse(getInboxItemPublished(b)) -
        Date.parse(getInboxItemPublished(a)),
    );

    return {
      ...compat.toPageResponse(params[0]),
      data,
    };
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

  async getPersonMentions(
    payload: Parameters<BaseClient["getPersonMentions"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPersonMentions"]> {
    const response = await this.#client.GET("/api/alpha/user/mentions", {
      ...options,
      params: { query: compat.fromPageParams(payload) },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.replies.map(compat.toPersonMentionView),
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

    const query = cleanThreadiverseParams(
      compat.fromPageParams(payload),
    ) satisfies paths["/api/alpha/post/list"]["get"]["parameters"]["query"];

    const response = await this.#client.GET("/api/alpha/post/list", {
      ...options,
      params: { query },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.posts.map(compat.toPostView),
    };
  }

  async getPrivateMessages(
    payload: Parameters<BaseClient["getPrivateMessages"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPrivateMessages"]> {
    const response = await this.#client.GET("/api/alpha/private_message/list", {
      ...options,
      params: { query: compat.fromPageParams(payload) },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.private_messages.map(compat.toPrivateMessageView),
    };
  }

  async getRandomCommunity(
    ..._params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    throw new UnsupportedError(
      "Get random community is not supported by piefed",
    );
  }

  async getReplies(
    payload: Parameters<BaseClient["getReplies"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getReplies"]> {
    const response = await this.#client.GET("/api/alpha/user/replies", {
      ...options,
      params: { query: compat.fromPageParams(payload) },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.replies.map(compat.toCommentReplyView),
    };
  }

  async getSite(options?: RequestOptions): ReturnType<BaseClient["getSite"]> {
    const response = await this.#client.GET("/api/alpha/site", {
      ...options,
    });

    return {
      ...response.data!,
      // TODO: piefed.ca is missing admins in the response for some reason????
      admins: (response.data!.admins ?? []).map(compat.toPersonView),
      my_user: response.data!.my_user
        ? {
            ...response.data!.my_user,
            community_blocks: response.data!.my_user?.community_blocks.map(
              ({ community }) => compat.toCommunity(community!),
            ),
            follows: response.data!.my_user.follows.map((f) => ({
              community: compat.toCommunity(f.community),
              follower: compat.toPerson(f.follower),
            })),
            instance_blocks: response.data!.my_user?.instance_blocks.map(
              ({ instance }) => instance,
            ),
            local_user_view: {
              ...response.data!.my_user.local_user_view,
              local_user: {
                admin: false, // TODO: piefed doesn't expose admin status in site response
                show_nsfw:
                  response.data!.my_user.local_user_view.local_user.show_nsfw,
              },
              person: compat.toPerson(
                response.data!.my_user.local_user_view.person,
              ),
            },
            moderates: response.data!.my_user.moderates.map(
              compat.toCommunityModeratorView,
            ),
            person_blocks: response.data!.my_user?.person_blocks.map(
              ({ target }) => compat.toPerson(target),
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
    ..._params: Parameters<BaseClient["getSiteMetadata"]>
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    throw new UnsupportedError("Get site metadata is not supported by piefed");
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
        ...payload,
        private: false,
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
        ...payload,
      },
    });

    return {
      post_view: compat.toPostView(response.data!.post_view),
    };
  }

  async listCommentReports(
    ..._params: Parameters<BaseClient["listCommentReports"]>
  ): ReturnType<BaseClient["listCommentReports"]> {
    throw new UnsupportedError(
      "List comment reports is not supported by piefed",
    );
  }

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommunities"]> {
    const response = await this.#client.GET("/api/alpha/community/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compat.fromPageParams(payload) },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.communities.map(compat.toCommunityView),
    };
  }

  async listPersonContent(
    payload: ListPersonContent,
    options?: RequestOptions,
  ): Promise<ListPersonContentResponse> {
    switch (payload.type) {
      case "All":
      case undefined: {
        const response = await Promise.all([
          this.#listPersonPosts(payload, options),

          this.#listPersonComments(payload, options),
        ]).then(([posts, comments]) =>
          [...posts.data, ...comments.data].sort(
            (a, b) =>
              getPostCommentItemCreatedDate(b) -
              getPostCommentItemCreatedDate(a),
          ),
        );

        return {
          ...compat.toPageResponse(payload),

          data: response,
        };
      }

      case "Comments":
        return this.#listPersonComments(payload, options);

      case "Posts":
        return this.#listPersonPosts(payload, options);
    }
  }

  async listPersonLiked(
    ..._params: Parameters<BaseClient["listPersonLiked"]>
  ): ReturnType<BaseClient["listPersonLiked"]> {
    throw new UnsupportedError("List person liked is not supported by piefed");
  }

  async listPersonSaved(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonContent"]> {
    const response = await this.#client.GET("/api/alpha/user", {
      ...options,
      params: {
        query: { ...compat.fromPageParams(payload), saved_only: true },
      },
    });

    const data = (() => {
      switch (payload.type) {
        case "All":
        case undefined:
          return [
            ...response.data!.posts.map(compat.toPostView),
            ...response.data!.comments.map(compat.toCommentView),
          ].sort(
            (a, b) =>
              getPostCommentItemCreatedDate(b) -
              getPostCommentItemCreatedDate(a),
          );
        case "Comments":
          return response.data!.comments.map(compat.toCommentView);
        case "Posts":
          return response.data!.posts.map(compat.toPostView);
      }
    })();

    return {
      ...compat.toPageResponse(payload),
      data,
    };
  }

  async listPostReports(
    ..._params: Parameters<BaseClient["listPostReports"]>
  ): ReturnType<BaseClient["listPostReports"]> {
    throw new UnsupportedError("List post reports is not supported by piefed");
  }

  async listReports(
    ..._params: Parameters<BaseClient["listReports"]>
  ): ReturnType<BaseClient["listReports"]> {
    throw new UnsupportedError("List reports is not supported by piefed");
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

  async logout(_options?: RequestOptions) {
    // piefed doesn't have a logout endpoint
  }

  async markAllAsRead(options: Parameters<BaseClient["markAllAsRead"]>[0]) {
    await this.#client.POST("/api/alpha/user/mark_all_as_read", options);
  }

  async markCommentReplyAsRead(
    payload: Parameters<BaseClient["markCommentReplyAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markCommentReplyAsRead"]> {
    await this.#client.POST("/api/alpha/comment/mark_as_read", {
      ...options,
      body: payload,
    });
  }

  async markPersonMentionAsRead(
    payload: Parameters<BaseClient["markPersonMentionAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markPersonMentionAsRead"]> {
    await this.#client.POST("/api/alpha/comment/mark_as_read", {
      ...options,
      body: {
        comment_reply_id: payload.person_mention_id,
        read: payload.read,
      },
    });
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

  async markPrivateMessageAsRead(
    payload: Parameters<BaseClient["markPrivateMessageAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markPrivateMessageAsRead"]> {
    await this.#client.POST("/api/alpha/private_message/mark_as_read", {
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
    ..._params: Parameters<BaseClient["resolveCommentReport"]>
  ): ReturnType<BaseClient["resolveCommentReport"]> {
    throw new UnsupportedError(
      "Resolve comment report is not supported by piefed",
    );
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
    ..._params: Parameters<BaseClient["resolvePostReport"]>
  ): ReturnType<BaseClient["resolvePostReport"]> {
    throw new UnsupportedError(
      "Resolve post report is not supported by piefed",
    );
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
    ..._params: Parameters<BaseClient["saveUserSettings"]>
  ): ReturnType<BaseClient["saveUserSettings"]> {
    throw new UnsupportedError("Save user settings is not supported by piefed");
  }

  async search(
    payload: Parameters<BaseClient["search"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["search"]> {
    const response = await this.#client.GET("/api/alpha/search", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compat.fromPageParams(payload) },
    });

    return {
      ...compat.toPageResponse(payload),
      data: [
        ...response.data!.communities.map(compat.toCommunityView),
        ...response.data!.posts.map(compat.toPostView),
        ...response.data!.users.map(compat.toPersonView),
        ...response.data!.comments.map(compat.toCommentView),
      ],
    };
  }

  async uploadImage(
    payload: Parameters<BaseClient["uploadImage"]>[0],
    options?: RequestOptions,
  ) {
    const formData = new FormData();
    formData.append("file", payload.file);

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

  async #listPersonComments(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.GET("/api/alpha/comment/list", {
      ...options,
      params: { query: { ...compat.fromPageParams(payload), sort: "New" } },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.comments.map(compat.toCommentView),
    };
  }

  async #listPersonPosts(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.GET("/api/alpha/post/list", {
      ...options,
      params: { query: { ...compat.fromPageParams(payload), sort: "New" } },
    });

    return {
      ...compat.toPageResponse(payload),
      data: response.data!.posts.map(compat.toPostView),
    };
  }
}

export default buildSafeClient(UnsafePiefedClient);
