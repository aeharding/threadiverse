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
import { Nodeinfo21Payload } from "./wellknown";

export interface ProviderInfo {
  name: "lemmy" | "piefed";
  version: string;
}

export interface BaseClientOptions {
  fetchFunction: typeof fetch;
  headers: Record<string, string>;
}

// Abstract base class that all providers should extend
export abstract class BaseClient {
  public abstract name: "lemmy" | "piefed";

  abstract resolveObject(payload: {
    q: string;
  }): Promise<ResolveObjectResponse>;

  abstract getSite(): Promise<SiteResponse>;

  abstract getCommunity(
    payload: GetCommunity,
  ): Promise<{ community_view: CommunityView }>;

  abstract getPosts(
    payload: GetPosts,
  ): Promise<{ posts: PostView[]; next_page?: string }>;

  abstract getComments(
    payload: GetComments,
  ): Promise<{ comments: CommentView[] }>;

  abstract getPost(payload: GetPost): Promise<{ post_view: PostView }>;

  abstract createPost(payload: CreatePost): Promise<{ post_view: PostView }>;

  abstract editPost(payload: EditPost): Promise<{ post_view: PostView }>;

  abstract createComment(
    payload: CreateComment,
  ): Promise<{ comment_view: CommentView }>;

  abstract editComment(
    payload: EditComment,
  ): Promise<{ comment_view: CommentView }>;

  abstract login(payload: {
    username_or_email: string;
    password: string;
    totp_2fa_token?: string;
  }): Promise<{ jwt?: string }>;
}
