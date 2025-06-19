import createClient from "openapi-fetch";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  compatPiefedCommentSortType,
  compatPiefedCommentView,
  compatPiefedCommunity,
  compatPiefedCommunityModeratorView,
  compatPiefedCommunityView,
  compatPiefedGetCommunityResponse,
  compatPiefedPerson,
  compatPiefedPersonView,
  compatPiefedPostSortType,
  compatPiefedPostView,
} from "./compat";
import { components, paths } from "./schema";

export default class PiefedClient implements BaseClient {
  name = "piefed" as const;

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

    return {
      ...response.data,
      person: response.data!.person
        ? compatPiefedPersonView(response.data!.person)
        : undefined,
      comment: response.data!.comment
        ? compatPiefedCommentView(response.data!.comment)
        : undefined,
      post: response.data!.post
        ? compatPiefedPostView(response.data!.post)
        : undefined,
      community: response.data!.community
        ? compatPiefedCommunityView(response.data!.community)
        : undefined,
    };
  }

  async getSite() {
    const response = await this.client.GET("/site");

    return {
      ...response.data!,
      site_view: {
        site: response.data!.site,
        local_site: {},
      },
      my_user: response.data!.my_user
        ? {
            ...response.data!.my_user,
            follows: response.data!.my_user.follows.map((f) => ({
              follower: compatPiefedPerson(f.follower),
              community: compatPiefedCommunity(f.community),
            })),
            moderates: response.data!.my_user.moderates.map(
              compatPiefedCommunityModeratorView,
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
    const query = {
      ...payload,
      sort: payload.sort ? compatPiefedPostSortType(payload.sort) : undefined,
    } satisfies components["schemas"]["GetPosts"];

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
    const query = {
      ...payload,
      sort: payload.sort
        ? compatPiefedCommentSortType(payload.sort)
        : undefined,
    } satisfies components["schemas"]["GetComments"];

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
}
