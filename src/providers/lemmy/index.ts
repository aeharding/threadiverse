import { LemmyHttp } from "lemmy-js-client";

import { BaseClient, BaseClientOptions } from "../../BaseClient";
import {
  compatLemmyCommentView,
  compatLemmyCommunityView,
  compatLemmyPostView,
} from "./compat";

export default class LemmyClient implements BaseClient {
  name = "lemmy" as const;

  private client: LemmyHttp;

  constructor(hostname: string, options: BaseClientOptions) {
    this.client = new LemmyHttp(hostname, options);
  }

  async resolveObject(payload: Parameters<BaseClient["resolveObject"]>[0]) {
    const response = await this.client.resolveObject(payload);

    return {
      ...response,
      comment: response.comment
        ? compatLemmyCommentView(response.comment)
        : undefined,
      post: response.post ? compatLemmyPostView(response.post) : undefined,
      community: response.community
        ? compatLemmyCommunityView(response.community)
        : undefined,
    };
  }

  async getSite(...params: Parameters<BaseClient["getSite"]>) {
    return this.client.getSite(...params);
  }

  async login(...params: Parameters<BaseClient["login"]>) {
    return this.client.login(...params);
  }

  async getCommunity(...params: Parameters<BaseClient["getCommunity"]>) {
    const response = await this.client.getCommunity(...params);

    return {
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async getPosts(...params: Parameters<BaseClient["getPosts"]>) {
    const response = await this.client.getPosts(...params);

    return {
      ...response,
      posts: response.posts.map(compatLemmyPostView),
    };
  }

  async getComments(...params: Parameters<BaseClient["getComments"]>) {
    const response = await this.client.getComments(...params);

    return {
      comments: response.comments.map(compatLemmyCommentView),
    };
  }

  async createPost(...params: Parameters<BaseClient["createPost"]>) {
    const response = await this.client.createPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async editPost(...params: Parameters<BaseClient["editPost"]>) {
    const response = await this.client.editPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async getPost(...params: Parameters<BaseClient["getPost"]>) {
    const response = await this.client.getPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async createComment(...params: Parameters<BaseClient["createComment"]>) {
    const response = await this.client.createComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async editComment(...params: Parameters<BaseClient["editComment"]>) {
    const response = await this.client.editComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }
}
