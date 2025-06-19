import {
  CommentView,
  CommunityView,
  CreateComment,
  CreatePost,
  EditComment,
  EditPost,
  GetComments,
  GetCommunity,
  GetPost,
  GetPosts,
  PostView,
  ResolveObjectResponse,
  SiteResponse,
} from "./types";

export interface ProviderInfo {
  name: "lemmy" | "piefed";
  version: string;
}

export type RequestOptions = Pick<RequestInit, "signal">;

export interface BaseClientOptions {
  fetchFunction: typeof fetch;
  headers: Record<string, string>;
}

// Abstract base class that all providers should extend
export abstract class BaseClient {
  public abstract name: "lemmy" | "piefed";

  abstract resolveObject(
    payload: {
      q: string;
    },
    options?: RequestOptions,
  ): Promise<ResolveObjectResponse>;

  abstract getSite(options?: RequestOptions): Promise<SiteResponse>;

  abstract getCommunity(
    payload: GetCommunity,
    options?: RequestOptions,
  ): Promise<{ community_view: CommunityView }>;

  abstract getPosts(
    payload: GetPosts,
    options?: RequestOptions,
  ): Promise<{ posts: PostView[]; next_page?: string }>;

  abstract getComments(
    payload: GetComments,
    options?: RequestOptions,
  ): Promise<{ comments: CommentView[] }>;

  abstract getPost(
    payload: GetPost,
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract createPost(
    payload: CreatePost,
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract editPost(
    payload: EditPost,
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract createComment(
    payload: CreateComment,
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract editComment(
    payload: EditComment,
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract login(
    payload: {
      username_or_email: string;
      password: string;
      totp_2fa_token?: string;
    },
    options?: RequestOptions,
  ): Promise<{ jwt?: string }>;
}
