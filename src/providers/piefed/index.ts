import createClient, { Middleware } from "openapi-fetch";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  InvalidPayloadError,
  PiefedResponseError,
  UnsupportedError,
} from "../../errors";
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
import {
  compatPiefedCommentReplyView,
  compatPiefedCommentView,
  compatPiefedCommunity,
  compatPiefedCommunityModeratorView,
  compatPiefedCommunityView,
  compatPiefedGetCommunityResponse,
  compatPiefedPageParams,
  compatPiefedPageResponse,
  compatPiefedPerson,
  compatPiefedPersonView,
  compatPiefedPostView,
  compatPiefedPrivateMessageView,
} from "./compat";
import { components, paths } from "./schema";

const piefedMiddleware: Middleware = {
  async onError({ error }) {
    return new PiefedResponseError("Fetch failed", { cause: error });
  },
  async onResponse({ response }) {
    if (response.status < 200 || response.status >= 300)
      throw new PiefedResponseError(`Bad request: ${response.status}`);
  },
};

export class UnsafePiefedClient implements BaseClient {
  static mode = "piefed" as const;

  static softwareName = "piefed" as const;

  // Piefed is not versioned atm
  static softwareVersionRange = "*";

  #client: ReturnType<typeof createClient<paths>>;

  constructor(url: string, options: BaseClientOptions) {
    this.#client = createClient({
      baseUrl: `${url}/api/alpha`,
      fetch: options.fetchFunction,
      // TODO: piefed doesn't allow CORS headers other than Authorization
      headers: options.headers.Authorization
        ? {
            Authorization: options.headers.Authorization,
          }
        : undefined,
    });

    this.#client.use(piefedMiddleware);
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["banFromCommunity"]> {
    await this.#client.POST("/community/moderate/ban", {
      ...options,
      // @ts-expect-error TODO: fix this
      body: payload,
    });
  }

  async blockCommunity(
    payload: Parameters<BaseClient["blockCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockCommunity"]> {
    const response = await this.#client.POST("/community/block", {
      ...options,
      body: { ...payload },
    });

    return {
      community_view: compatPiefedCommunityView(response.data!.community_view),
    };
  }

  async blockInstance(
    payload: Parameters<BaseClient["blockInstance"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockInstance"]> {
    await this.#client.POST("/site/block", {
      ...options,
      body: { ...payload },
    });
  }

  async blockPerson(
    payload: Parameters<BaseClient["blockPerson"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockPerson"]> {
    const response = await this.#client.POST("/user/block", {
      ...options,
      body: { ...payload },
    });

    return {
      ...response.data!,
      person_view: compatPiefedPersonView(response.data!.person_view),
    };
  }

  async createComment(
    payload: Parameters<BaseClient["createComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createComment"]> {
    const response = await this.#client.POST("/comment", {
      ...options,
      body: {
        ...payload,
        body: payload.content,
      },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async createCommentReport(
    payload: Parameters<BaseClient["createCommentReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createCommentReport"]> {
    await this.#client.POST("/comment/report", {
      ...options,
      body: { ...payload },
    });
  }

  async createPost(
    payload: Parameters<BaseClient["createPost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.POST("/post", {
      ...options,
      body: {
        ...payload,
        title: payload.name,
      },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async createPostReport(
    payload: Parameters<BaseClient["createPostReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createPostReport"]> {
    await this.#client.POST("/post/report", {
      ...options,
      body: { ...payload },
    });
  }

  async createPrivateMessage(
    ..._params: Parameters<BaseClient["createPrivateMessage"]>
  ): ReturnType<BaseClient["createPrivateMessage"]> {
    throw new UnsupportedError(
      "Create private message is not supported by piefed",
    );
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
    const response = await this.#client.POST("/comment/delete", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
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
    const response = await this.#client.POST("/post/delete", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
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
    const response = await this.#client.PUT("/comment", {
      ...options,
      body: {
        ...payload,
        body: payload.content,
      },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async editPost(
    payload: Parameters<BaseClient["editPost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.PUT("/post", {
      ...options,
      body: {
        ...payload,
        title: payload.name,
      },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async featurePost(
    payload: Parameters<BaseClient["featurePost"]>[0],
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/post/feature", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async followCommunity(
    payload: Parameters<BaseClient["followCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["followCommunity"]> {
    const response = await this.#client.POST("/community/follow", {
      ...options,
      body: { ...payload },
    });

    return {
      community_view: compatPiefedCommunityView(response.data!.community_view),
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
      compatPiefedPageParams(payload),
    ) satisfies components["schemas"]["GetComments"];

    const response = await this.#client.GET("/comment/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.comments.map(compatPiefedCommentView),
    };
  }

  async getCommunity(
    payload: Parameters<BaseClient["getCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getCommunity"]> {
    const response = await this.#client.GET("/community", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    return compatPiefedGetCommunityResponse(response.data!);
  }

  async getFederatedInstances(
    ..._params: Parameters<BaseClient["getFederatedInstances"]>
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.#client.GET("/federated_instances");

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
      ...compatPiefedPageResponse(params[0]),
      data,
    };
  }

  async getPersonDetails(
    payload: Parameters<BaseClient["getPersonDetails"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPersonDetails"]> {
    const response = await this.#client.GET("/user", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    return {
      ...response.data!,
      moderates: response.data!.moderates.map(
        compatPiefedCommunityModeratorView,
      ),
      person_view: compatPiefedPersonView(response.data!.person_view),
    };
  }

  async getPersonMentions(
    _payload: Parameters<BaseClient["getPersonMentions"]>[0],
    _options?: RequestOptions,
  ): ReturnType<BaseClient["getPersonMentions"]> {
    return { data: [] }; // TODO: implement this
  }

  async getPost(
    payload: Parameters<BaseClient["getPost"]>[0],
    options?: RequestOptions,
  ) {
    const query = payload satisfies components["schemas"]["GetPost"];

    const response = await this.#client.GET("/post", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
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
      compatPiefedPageParams(payload),
    ) satisfies components["schemas"]["GetPosts"];

    const response = await this.#client.GET("/post/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.posts.map(compatPiefedPostView),
    };
  }

  async getPrivateMessages(
    payload: Parameters<BaseClient["getPrivateMessages"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPrivateMessages"]> {
    const response = await this.#client.GET("/private_message/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compatPiefedPageParams(payload) },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.private_messages.map(compatPiefedPrivateMessageView),
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
    const response = await this.#client.GET("/user/replies", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compatPiefedPageParams(payload) },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.replies.map(compatPiefedCommentReplyView),
    };
  }

  async getSite(options?: RequestOptions): ReturnType<BaseClient["getSite"]> {
    const response = await this.#client.GET("/site", options);

    return {
      ...response.data!,
      // TODO: piefed.ca is missing admins in the response for some reason????
      admins: (response.data!.admins ?? []).map(compatPiefedPersonView),
      my_user: response.data!.my_user
        ? {
            ...response.data!.my_user,
            community_blocks: response.data!.my_user?.community_blocks.map(
              ({ community }) => compatPiefedCommunity(community),
            ),
            follows: response.data!.my_user.follows.map((f) => ({
              community: compatPiefedCommunity(f.community),
              follower: compatPiefedPerson(f.follower),
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
              person: compatPiefedPerson(
                response.data!.my_user.local_user_view.person,
              ),
            },
            moderates: response.data!.my_user.moderates.map(
              compatPiefedCommunityModeratorView,
            ),
            person_blocks: response.data!.my_user?.person_blocks.map(
              ({ person }) => compatPiefedPerson(person),
            ),
          }
        : undefined,
      site_view: {
        local_site: {
          captcha_enabled: false,
          registration_mode: response.data!.site.registration_mode!,
          require_email_verification: false,
        },
        site: response.data!.site,
      },
    };
  }

  async getSiteMetadata(
    ..._params: Parameters<BaseClient["getSiteMetadata"]>
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    throw new UnsupportedError("Get site metadata is not supported by piefed");
  }

  async getUnreadCount(options?: RequestOptions) {
    const response = await this.#client.GET("/user/unread_count", {
      ...options,
    });

    return response.data!;
  }

  async likeComment(
    payload: Parameters<BaseClient["likeComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["likeComment"]> {
    const response = await this.#client.POST("/comment/like", {
      ...options,
      body: {
        ...payload,
      },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async likePost(
    payload: Parameters<BaseClient["likePost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.POST("/post/like", {
      ...options,
      body: {
        ...payload,
      },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
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
    const response = await this.#client.GET("/community/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compatPiefedPageParams(payload) },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.communities.map(compatPiefedCommunityView),
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
          ...compatPiefedPageResponse(payload),
          data: response,
        };
      }
      case "Comments":
        return this.#listPersonComments(payload, options);
      case "Posts":
        return this.#listPersonPosts(payload, options);
    }
  }

  async listPersonSaved(
    ..._params: Parameters<BaseClient["listPersonSaved"]>
  ): ReturnType<BaseClient["listPersonSaved"]> {
    // TODO: https://codeberg.org/rimu/pyfedi/issues/925
    throw new UnsupportedError("List person saved is not supported by piefed");
    // return this.listPersonContent(
    //   {
    //     ...payload,
    //     // @ts-expect-error TODO: fix this
    //     saved_only: true,
    //   },
    //   options,
    // );
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
    const response = await this.#client.POST("/post/lock", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async login(
    payload: Parameters<BaseClient["login"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.POST("/user/login", {
      ...options,
      body: { password: payload.password, username: payload.username_or_email },
    });
    return response.data!;
  }

  async logout(_options?: RequestOptions) {
    // piefed doesn't have a logout endpoint
  }

  async markAllAsRead(options: Parameters<BaseClient["markAllAsRead"]>[0]) {
    await this.#client.POST("/user/mark_all_as_read", options);
  }

  async markCommentReplyAsRead(
    payload: Parameters<BaseClient["markCommentReplyAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markCommentReplyAsRead"]> {
    // @ts-expect-error TODO fix piefed api docs
    await this.#client.POST("/comment/mark_as_read", {
      ...options,
      body: payload,
    });
  }

  async markPersonMentionAsRead(
    payload: Parameters<BaseClient["markPersonMentionAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markPersonMentionAsRead"]> {
    // @ts-expect-error TODO fix piefed api docs
    await this.#client.POST("/mention/mark_as_read", {
      ...options,
      body: payload,
    });
  }

  async markPostAsRead(..._params: Parameters<BaseClient["markPostAsRead"]>) {
    throw new UnsupportedError("Mark post as read is not supported by piefed");
  }

  async markPrivateMessageAsRead(
    payload: Parameters<BaseClient["markPrivateMessageAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markPrivateMessageAsRead"]> {
    // @ts-expect-error TODO fix piefed api docs
    await this.#client.POST("/private_message/mark_as_read", {
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
    const response = await this.#client.POST("/comment/remove", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async removePost(
    payload: { post_id: number; removed: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.#client.POST("/post/remove", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
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
    const response = await this.#client.GET("/resolve_object", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    // @ts-expect-error TODO: error handling
    if (!response.data) throw new Error(response.error.error);

    return {
      ...response.data,
      comment: response.data.comment
        ? compatPiefedCommentView(response.data.comment)
        : undefined,
      community: response.data.community
        ? compatPiefedCommunityView(response.data.community)
        : undefined,
      person: response.data.person
        ? compatPiefedPersonView(response.data!.person)
        : undefined,
      post: response.data.post
        ? compatPiefedPostView(response.data!.post)
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
    ..._params: Parameters<BaseClient["saveComment"]>
  ): ReturnType<BaseClient["saveComment"]> {
    throw new UnsupportedError("Save comment is not supported by piefed");
  }

  async savePost(
    payload: Parameters<BaseClient["savePost"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["savePost"]> {
    const response = await this.#client.PUT("/post/save", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
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
    if (payload.type_ === "Comments") {
      throw new UnsupportedError("Comment search is not supported by piefed");
    }

    const response = await this.#client.GET("/search", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compatPiefedPageParams(payload) },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: [
        ...response.data!.communities.map(compatPiefedCommunityView),
        ...response.data!.posts.map(compatPiefedPostView),
        ...response.data!.users.map(compatPiefedPersonView),
      ],
    };
  }

  async uploadImage(
    payload: Parameters<BaseClient["uploadImage"]>[0],
    options?: RequestOptions,
  ) {
    const formData = new FormData();
    formData.append("file", payload.file);

    const response = await this.#client.POST("/upload/image", {
      ...options,
      // @ts-expect-error TODO: fix this
      body: formData,
    });

    return {
      url: response.data!.url,
    };
  }

  async #listPersonComments(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.GET("/comment/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compatPiefedPageParams(payload) },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.comments.map(compatPiefedCommentView),
    };
  }

  async #listPersonPosts(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.#client.GET("/post/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: compatPiefedPageParams(payload) },
    });

    return {
      ...compatPiefedPageResponse(payload),
      data: response.data!.posts.map(compatPiefedPostView),
    };
  }
}

export default buildSafeClient(UnsafePiefedClient);
