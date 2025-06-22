import createClient from "openapi-fetch";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import { InvalidPayloadError, UnsupportedError } from "../../errors";
import {
  compatPiefedCommentView,
  compatPiefedCommunity,
  compatPiefedCommunityModeratorView,
  compatPiefedCommunityView,
  compatPiefedGetCommunityResponse,
  compatPiefedPerson,
  compatPiefedPersonView,
  compatPiefedPostView,
} from "./compat";
import { components, paths } from "./schema";
import {
  CommunityView,
  ListPersonContent,
  ListPersonContentResponse,
  PostView,
} from "../../types";
import { cleanThreadiverseParams } from "../../helpers";
import { getPostCommentItemCreatedDate } from "../lemmyv0/helpers";

export default class PiefedClient implements BaseClient {
  static mode = "piefed" as const;

  static softwareName = "piefed" as const;

  // Piefed is not versioned atm
  static softwareVersionRange = "*";

  private client: ReturnType<typeof createClient<paths>>;

  constructor(url: string, options: BaseClientOptions) {
    this.client = createClient({
      baseUrl: `${url}/api/alpha`,
      // TODO: piefed doesn't allow CORS headers other than Authorization
      headers: options.headers.Authorization
        ? {
            Authorization: options.headers.Authorization,
          }
        : undefined,
      fetch: options.fetchFunction,
    });
  }

  async resolveObject(payload: Parameters<BaseClient["resolveObject"]>[0]) {
    const response = await this.client.GET("/resolve_object", {
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    // @ts-expect-error TODO: error handling
    if (!response.data) throw new Error(response.error.error);

    return {
      ...response.data,
      person: response.data.person
        ? compatPiefedPersonView(response.data!.person)
        : undefined,
      comment: response.data.comment
        ? compatPiefedCommentView(response.data.comment)
        : undefined,
      post: response.data.post
        ? compatPiefedPostView(response.data!.post)
        : undefined,
      community: response.data.community
        ? compatPiefedCommunityView(response.data.community)
        : undefined,
    };
  }

  async getSite(options?: RequestOptions) {
    const response = await this.client.GET("/site", options);

    return {
      ...response.data!,
      admins: response.data!.admins.map(compatPiefedPersonView),
      site_view: {
        site: response.data!.site,
        local_site: {
          require_email_verification: false,
          captcha_enabled: false,
          registration_mode: response.data!.site.registration_mode!,
        },
      },
      my_user: response.data!.my_user
        ? {
            ...response.data!.my_user,
            local_user_view: {
              ...response.data!.my_user.local_user_view,
              person: compatPiefedPerson(
                response.data!.my_user.local_user_view.person,
              ),
              local_user: {
                admin: false, // TODO: piefed doesn't expose admin status in site response
                show_nsfw:
                  response.data!.my_user.local_user_view.local_user.show_nsfw,
              },
            },
            follows: response.data!.my_user.follows.map((f) => ({
              follower: compatPiefedPerson(f.follower),
              community: compatPiefedCommunity(f.community),
            })),
            moderates: response.data!.my_user.moderates.map(
              compatPiefedCommunityModeratorView,
            ),
            community_blocks: response.data!.my_user?.community_blocks.map(
              ({ community }) => compatPiefedCommunity(community),
            ),
            instance_blocks: response.data!.my_user?.instance_blocks.map(
              ({ instance }) => instance,
            ),
            person_blocks: response.data!.my_user?.person_blocks.map(
              ({ person }) => compatPiefedPerson(person),
            ),
          }
        : undefined,
    };
  }

  async login(
    payload: Parameters<BaseClient["login"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.POST("/user/login", {
      ...options,
      body: { username: payload.username_or_email, password: payload.password },
    });
    return response.data!;
  }

  async logout(_options?: RequestOptions) {
    // piefed doesn't have a logout endpoint
  }

  async getCommunity(
    payload: Parameters<BaseClient["getCommunity"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.GET("/community", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    return compatPiefedGetCommunityResponse(response.data!);
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.mode && payload.mode !== "piefed")
      throw new InvalidPayloadError(
        `Connected to piefed, ${payload.mode} is not supported`,
      );

    const query = cleanThreadiverseParams(
      payload,
    ) satisfies components["schemas"]["GetPosts"];

    const response = await this.client.GET("/post/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query },
    });

    return {
      posts: response.data!.posts.map(compatPiefedPostView),
    };
  }

  async getComments(
    payload: Parameters<BaseClient["getComments"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.mode && payload.mode !== "piefed")
      throw new InvalidPayloadError(
        `Connected to piefed, ${payload.mode} is not supported`,
      );

    const query = cleanThreadiverseParams(
      payload,
    ) satisfies components["schemas"]["GetComments"];

    const response = await this.client.GET("/comment/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query },
    });

    return {
      comments: response.data!.comments.map(compatPiefedCommentView),
    };
  }

  async createPost(
    payload: Parameters<BaseClient["createPost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.POST("/post", {
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

  async editPost(
    payload: Parameters<BaseClient["editPost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.PUT("/post", {
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

  async getPost(
    payload: Parameters<BaseClient["getPost"]>[0],
    options?: RequestOptions,
  ) {
    const query = payload satisfies components["schemas"]["GetPost"];

    const response = await this.client.GET("/post", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async createComment(
    payload: Parameters<BaseClient["createComment"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.POST("/comment", {
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

  async editComment(
    payload: Parameters<BaseClient["editComment"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.PUT("/comment", {
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

  async createPrivateMessage(
    ..._params: Parameters<BaseClient["createPrivateMessage"]>
  ): ReturnType<BaseClient["createPrivateMessage"]> {
    throw new UnsupportedError("Private messaging is not supported by piefed");
  }

  async getUnreadCount(options?: RequestOptions) {
    const response = await this.client.GET("/user/unread_count", {
      ...options,
    });

    return response.data!;
  }

  async getFederatedInstances(
    ..._params: Parameters<BaseClient["getFederatedInstances"]>
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.client.GET("/federated_instances");

    return response.data!;
  }

  async markPostAsRead(..._params: Parameters<BaseClient["markPostAsRead"]>) {
    throw new UnsupportedError("Mark post as read is not supported by piefed");
  }

  async likePost(
    payload: Parameters<BaseClient["likePost"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.POST("/post/like", {
      ...options,
      body: {
        ...payload,
      },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async likeComment(
    payload: Parameters<BaseClient["likeComment"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.POST("/comment/like", {
      ...options,
      body: {
        ...payload,
      },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async savePost(
    payload: Parameters<BaseClient["savePost"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["savePost"]> {
    const response = await this.client.PUT("/post/save", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async deletePost(
    payload: { post_id: number; deleted: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.client.POST("/post/delete", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async removePost(
    payload: { post_id: number; removed: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.client.POST("/post/remove", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async lockPost(
    payload: { post_id: number; locked: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.client.POST("/post/lock", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async featurePost(
    payload: Parameters<BaseClient["featurePost"]>[0],
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }> {
    const response = await this.client.POST("/post/feature", {
      ...options,
      body: { ...payload },
    });

    return {
      post_view: compatPiefedPostView(response.data!.post_view),
    };
  }

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions,
  ): Promise<{ communities: CommunityView[] }> {
    const response = await this.client.GET("/community/list", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    return {
      communities: response.data!.communities.map(compatPiefedCommunityView),
    };
  }

  async search(
    payload: Parameters<BaseClient["search"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.type_ === "Comments") {
      throw new UnsupportedError("Comment search is not supported by piefed");
    }

    const response = await this.client.GET("/search", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    return {
      comments: [],
      posts: response.data!.posts.map(compatPiefedPostView),
      communities: response.data!.communities.map(compatPiefedCommunityView),
      users: response.data!.users.map(compatPiefedPersonView),
    };
  }

  async getPersonDetails(
    payload: Parameters<BaseClient["getPersonDetails"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.GET("/user", {
      ...options,
      // @ts-expect-error TODO: fix this
      params: { query: payload },
    });

    return {
      ...response.data!,
      person_view: compatPiefedPersonView(response.data!.person_view),
      moderates: response.data!.moderates.map(
        compatPiefedCommunityModeratorView,
      ),
    };
  }

  async listPersonContent(
    payload: ListPersonContent,
    options?: RequestOptions,
  ): Promise<ListPersonContentResponse> {
    const [postsResponse, commentsResponse] = await Promise.all([
      this.client.GET("/post/list", {
        ...options,
        // @ts-expect-error TODO: fix this
        params: { query: payload },
      }),
      this.client.GET("/comment/list", {
        ...options,
        // @ts-expect-error TODO: fix this
        params: { query: payload },
      }),
    ]);

    return {
      content: [
        ...postsResponse.data!.posts.map(compatPiefedPostView),
        ...commentsResponse.data!.comments.map(compatPiefedCommentView),
      ].sort(
        (a, b) =>
          getPostCommentItemCreatedDate(b) - getPostCommentItemCreatedDate(a),
      ),
    };
  }

  async listPersonSaved(
    ..._params: Parameters<BaseClient["listPersonSaved"]>
  ): ReturnType<BaseClient["listPersonSaved"]> {
    throw new UnsupportedError("List person saved is not supported by piefed");
  }

  async getNotifications(
    ..._params: Parameters<BaseClient["getNotifications"]>
  ): ReturnType<BaseClient["getNotifications"]> {
    throw new UnsupportedError(
      "Get notifications is not supported by threadiverse library",
    );
  }

  async getPersonMentions(
    ..._params: Parameters<BaseClient["getPersonMentions"]>
  ): ReturnType<BaseClient["getPersonMentions"]> {
    throw new UnsupportedError(
      "Get person mentions is not supported by threadiverse library",
    );
  }

  async markPersonMentionAsRead(
    ..._params: Parameters<BaseClient["markPersonMentionAsRead"]>
  ): ReturnType<BaseClient["markPersonMentionAsRead"]> {
    throw new UnsupportedError(
      "Mark person mention as read is not supported by threadiverse library",
    );
  }

  async markPrivateMessageAsRead(
    ..._params: Parameters<BaseClient["markPrivateMessageAsRead"]>
  ): ReturnType<BaseClient["markPrivateMessageAsRead"]> {
    throw new UnsupportedError(
      "Mark private message as read is not supported by threadiverse library",
    );
  }

  async markCommentReplyAsRead(
    ..._params: Parameters<BaseClient["markCommentReplyAsRead"]>
  ): ReturnType<BaseClient["markCommentReplyAsRead"]> {
    throw new UnsupportedError(
      "Mark comment reply as read is not supported by threadiverse library",
    );
  }

  async markAllAsRead(options: Parameters<BaseClient["markAllAsRead"]>[0]) {
    await this.client.POST("/user/mark_all_as_read", options);
  }

  async getPrivateMessages(
    ..._params: Parameters<BaseClient["getPrivateMessages"]>
  ): ReturnType<BaseClient["getPrivateMessages"]> {
    throw new UnsupportedError(
      "Get private messages is not supported by piefed",
    );
  }

  async saveUserSettings(
    ..._params: Parameters<BaseClient["saveUserSettings"]>
  ): ReturnType<BaseClient["saveUserSettings"]> {
    throw new UnsupportedError("Save user settings is not supported by piefed");
  }

  async blockInstance(
    payload: Parameters<BaseClient["blockInstance"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockInstance"]> {
    await this.client.POST("/site/block", {
      ...options,
      body: { ...payload },
    });
  }

  async uploadImage(
    payload: Parameters<BaseClient["uploadImage"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.POST("/upload/image", {
      ...options,
      body: { file: payload.file as unknown as string },
    });

    return {
      url: response.data!.url,
    };
  }

  async deleteImage(
    ..._params: Parameters<BaseClient["deleteImage"]>
  ): ReturnType<BaseClient["deleteImage"]> {
    throw new UnsupportedError("Delete image is not supported by piefed");
  }

  async register(
    ..._params: Parameters<BaseClient["register"]>
  ): ReturnType<BaseClient["register"]> {
    throw new UnsupportedError("Register is not supported by piefed");
  }

  async getCaptcha(
    ..._params: Parameters<BaseClient["getCaptcha"]>
  ): ReturnType<BaseClient["getCaptcha"]> {
    throw new UnsupportedError("Get captcha is not supported by piefed");
  }

  async listReports(
    ..._params: Parameters<BaseClient["listReports"]>
  ): ReturnType<BaseClient["listReports"]> {
    throw new UnsupportedError("List reports is not supported by piefed");
  }

  async getModlog(
    ..._params: Parameters<BaseClient["getModlog"]>
  ): ReturnType<BaseClient["getModlog"]> {
    throw new UnsupportedError("Get modlog is not supported by piefed");
  }

  async getReplies(
    ..._params: Parameters<BaseClient["getReplies"]>
  ): ReturnType<BaseClient["getReplies"]> {
    throw new UnsupportedError("Get replies is not supported by piefed");
  }

  async banFromCommunity(
    payload: Parameters<BaseClient["banFromCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["banFromCommunity"]> {
    await this.client.POST("/community/moderate/ban", {
      ...options,
      // @ts-expect-error TODO: fix this
      body: payload,
    });
  }

  async saveComment(
    ..._params: Parameters<BaseClient["saveComment"]>
  ): ReturnType<BaseClient["saveComment"]> {
    throw new UnsupportedError("Save comment is not supported by piefed");
  }

  async distinguishComment(
    ..._params: Parameters<BaseClient["distinguishComment"]>
  ): ReturnType<BaseClient["distinguishComment"]> {
    throw new UnsupportedError(
      "Distinguish comment is not supported by piefed",
    );
  }

  async deleteComment(
    payload: Parameters<BaseClient["deleteComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["deleteComment"]> {
    const response = await this.client.POST("/comment/delete", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async removeComment(
    payload: Parameters<BaseClient["removeComment"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["removeComment"]> {
    const response = await this.client.POST("/comment/remove", {
      ...options,
      body: { ...payload },
    });

    return {
      comment_view: compatPiefedCommentView(response.data!.comment_view),
    };
  }

  async followCommunity(
    payload: Parameters<BaseClient["followCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["followCommunity"]> {
    const response = await this.client.POST("/community/follow", {
      ...options,
      body: { ...payload },
    });

    return {
      community_view: compatPiefedCommunityView(response.data!.community_view),
    };
  }

  async blockCommunity(
    payload: Parameters<BaseClient["blockCommunity"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockCommunity"]> {
    const response = await this.client.POST("/community/block", {
      ...options,
      body: { ...payload },
    });

    return {
      community_view: compatPiefedCommunityView(response.data!.community_view),
    };
  }

  async blockPerson(
    payload: Parameters<BaseClient["blockPerson"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["blockPerson"]> {
    const response = await this.client.POST("/user/block", {
      ...options,
      body: { ...payload },
    });

    return {
      ...response.data!,
      person_view: compatPiefedPersonView(response.data!.person_view),
    };
  }

  async createPostReport(
    payload: Parameters<BaseClient["createPostReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createPostReport"]> {
    await this.client.POST("/post/report", {
      ...options,
      body: { ...payload },
    });
  }

  async createCommentReport(
    payload: Parameters<BaseClient["createCommentReport"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["createCommentReport"]> {
    await this.client.POST("/comment/report", {
      ...options,
      body: { ...payload },
    });
  }

  async createPrivateMessageReport(
    ..._params: Parameters<BaseClient["createPrivateMessageReport"]>
  ): ReturnType<BaseClient["createPrivateMessageReport"]> {
    throw new UnsupportedError(
      "Create private message report is not supported by piefed",
    );
  }

  async getSiteMetadata(
    ..._params: Parameters<BaseClient["getSiteMetadata"]>
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    throw new UnsupportedError("Get site metadata is not supported by piefed");
  }

  async resolvePostReport(
    ..._params: Parameters<BaseClient["resolvePostReport"]>
  ): ReturnType<BaseClient["resolvePostReport"]> {
    throw new UnsupportedError(
      "Resolve post report is not supported by piefed",
    );
  }

  async resolveCommentReport(
    ..._params: Parameters<BaseClient["resolveCommentReport"]>
  ): ReturnType<BaseClient["resolveCommentReport"]> {
    throw new UnsupportedError(
      "Resolve comment report is not supported by piefed",
    );
  }

  async getRandomCommunity(
    ..._params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    throw new UnsupportedError(
      "Get random community is not supported by piefed",
    );
  }

  async listPostReports(
    ..._params: Parameters<BaseClient["listPostReports"]>
  ): ReturnType<BaseClient["listPostReports"]> {
    throw new UnsupportedError("List post reports is not supported by piefed");
  }

  async listCommentReports(
    ..._params: Parameters<BaseClient["listCommentReports"]>
  ): ReturnType<BaseClient["listCommentReports"]> {
    throw new UnsupportedError(
      "List comment reports is not supported by piefed",
    );
  }
}
