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

  async getSite() {
    return this.client.getSite();
  }

  async login(payload: Parameters<BaseClient["login"]>[0]) {
    return this.client.login(payload);
  }

  async getCommunity(payload: Parameters<BaseClient["getCommunity"]>[0]) {
    const response = await this.client.getCommunity(payload);

    return {
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async getPosts(payload: Parameters<BaseClient["getPosts"]>[0]) {
    const response = await this.client.getPosts(payload);

    return {
      ...response,
      posts: response.posts.map(compatLemmyPostView),
    };
  }

  async getComments(payload: Parameters<BaseClient["getComments"]>[0]) {
    const response = await this.client.getComments(payload);

    return {
      comments: response.comments.map(compatLemmyCommentView),
    };
  }

  async createPost(payload: Parameters<BaseClient["createPost"]>[0]) {
    const response = await this.client.createPost(payload);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async editPost(payload: Parameters<BaseClient["editPost"]>[0]) {
    const response = await this.client.editPost(payload);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async getPost(payload: Parameters<BaseClient["getPost"]>[0]) {
    const response = await this.client.getPost(payload);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async createComment(payload: Parameters<BaseClient["createComment"]>[0]) {
    const response = await this.client.createComment(payload);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async editComment(payload: Parameters<BaseClient["editComment"]>[0]) {
    const response = await this.client.editComment(payload);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }
}
