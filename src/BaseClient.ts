import {
  CommentReplyView,
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
  PersonMentionView,
  PostView,
  PrivateMessageView,
  ResolveObjectResponse,
  GetSiteResponse,
  ListReports,
  ListReportsResponse,
  GetCommunityResponse,
  ListingType,
  PostReportView,
  CommentReportView,
  GetModlog,
} from "./types";
import { GetUnreadCountResponse } from "./types/GetUnreadCountResponse";
import { FederatedInstances } from "./types/FederatedInstances";
import { ListCommunities } from "./types/ListCommunities";
import { Search } from "./types/Search";
import { PersonView } from "./types/PersonView";
import { GetPersonDetailsResponse } from "./types/GetPersonDetailsResponse";
import {
  GetCaptchaResponse,
  GetPersonMentions,
  GetSiteMetadataResponse,
} from "lemmy-js-client";
import { GetPrivateMessages } from "./types/GetPrivateMessages";
import { UploadImageResponse } from "./types/UploadImageResponse";
import { Register } from "./types/Register";
import { LoginResponse } from "./types/LoginResponse";
import { GetModlogResponse } from "./types/GetModlogResponse";
import { GetReplies } from "./types/GetReplies";
import { BanFromCommunity } from "./types/BanFromCommunity";
import { Notification } from "./types/Notification";
import { ListPersonContent } from "./types/ListPersonContent";
import { ListPersonContentResponse } from "./types/ListPersonContentResponse";

export interface ProviderInfo {
  name: "lemmy" | "piefed";
  version: string;
}

export type RequestOptions = Pick<RequestInit, "signal">;

export interface BaseClientOptions {
  fetchFunction: typeof fetch;
  headers: Record<string, string>;
}

export type ThreadiverseMode = "lemmyv0" | "lemmyv1" | "piefed";

// Abstract base class that all providers should extend
export abstract class BaseClient {
  static mode: ThreadiverseMode;

  static softwareName: "lemmy" | "piefed";
  /**
   * NPM semver range, e.g. ">=1.0.0 <2.0.0"
   */
  static softwareVersionRange: string;

  abstract resolveObject(
    payload: {
      q: string;
    },
    options?: RequestOptions,
  ): Promise<ResolveObjectResponse>;

  abstract getSite(options?: RequestOptions): Promise<GetSiteResponse>;

  abstract getCommunity(
    payload: GetCommunity,
    options?: RequestOptions,
  ): Promise<GetCommunityResponse>;

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

  abstract createPrivateMessage(
    payload: { content: string; recipient_id: number },
    options?: RequestOptions,
  ): Promise<{ private_message_view: PrivateMessageView }>;

  abstract login(
    payload: {
      username_or_email: string;
      password: string;
      totp_2fa_token?: string;
    },
    options?: RequestOptions,
  ): Promise<{ jwt?: string }>;

  abstract logout(options?: RequestOptions): Promise<void>;

  abstract getUnreadCount(
    options?: RequestOptions,
  ): Promise<GetUnreadCountResponse>;

  abstract getFederatedInstances(options?: RequestOptions): Promise<{
    federated_instances?: FederatedInstances;
  }>;

  abstract markPostAsRead(
    payload: { post_ids: number[]; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract likePost(
    payload: { post_id: number; score: number },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract likeComment(
    payload: { comment_id: number; score: number },
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract savePost(
    payload: { post_id: number; save: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract deletePost(
    payload: { post_id: number; deleted: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract removePost(
    payload: { post_id: number; removed: boolean; reason?: string },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract lockPost(
    payload: { post_id: number; locked: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract featurePost(
    payload: {
      post_id: number;
      featured: boolean;
      feature_type: "Community" | "Local";
    },
    options?: RequestOptions,
  ): Promise<{ post_view: PostView }>;

  abstract listCommunities(
    payload: ListCommunities,
    options?: RequestOptions,
  ): Promise<{ communities: CommunityView[] }>;

  abstract search(
    payload: Search,
    options?: RequestOptions,
  ): Promise<{
    comments: CommentView[];
    posts: PostView[];
    communities: CommunityView[];
    users: PersonView[];
  }>;

  abstract getPersonDetails(
    payload: { person_id: number } | { username: string },
    options?: RequestOptions,
  ): Promise<GetPersonDetailsResponse>;

  abstract listPersonContent(
    payload: ListPersonContent,
    options?: RequestOptions,
  ): Promise<ListPersonContentResponse>;

  abstract getNotifications(
    payload: GetPersonMentions,
    options?: RequestOptions,
  ): Promise<{
    notifications: Notification[];
  }>;

  abstract getPersonMentions(
    payload: GetPersonMentions,
    options?: RequestOptions,
  ): Promise<{ mentions: PersonMentionView[] }>;

  abstract markPersonMentionAsRead(
    payload: { person_mention_id: number; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract markPrivateMessageAsRead(
    payload: { private_message_id: number; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract markCommentReplyAsRead(
    payload: { comment_reply_id: number; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract markAllAsRead(options?: RequestOptions): Promise<void>;

  abstract getPrivateMessages(
    payload: GetPrivateMessages,
    options?: RequestOptions,
  ): Promise<{ private_messages: PrivateMessageView[] }>;

  abstract saveUserSettings(
    payload: { show_nsfw: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract blockInstance(
    payload: { instance_id: number; block: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract uploadImage(
    payload: { file: File },
    options?: RequestOptions,
  ): Promise<UploadImageResponse>;

  abstract deleteImage(
    payload: { url: string; delete_token: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract register(
    payload: Register,
    options?: RequestOptions,
  ): Promise<LoginResponse>;

  abstract getCaptcha(options?: RequestOptions): Promise<GetCaptchaResponse>;

  abstract listReports(
    payload: ListReports,
    options?: RequestOptions,
  ): Promise<ListReportsResponse>;

  abstract getModlog(
    payload: GetModlog,
    options?: RequestOptions,
  ): Promise<GetModlogResponse>;

  abstract getReplies(
    payload: GetReplies,
    options?: RequestOptions,
  ): Promise<{ replies: CommentReplyView[] }>;

  abstract banFromCommunity(
    payload: BanFromCommunity,
    options?: RequestOptions,
  ): Promise<void>;

  abstract saveComment(
    payload: { comment_id: number; save: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract distinguishComment(
    payload: { comment_id: number; distinguished: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract deleteComment(
    payload: { comment_id: number; deleted: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract removeComment(
    payload: { comment_id: number; removed: boolean; reason?: string },
    options?: RequestOptions,
  ): Promise<{ comment_view: CommentView }>;

  abstract followCommunity(
    payload: { community_id: number; follow: boolean },
    options?: RequestOptions,
  ): Promise<{ community_view: CommunityView }>;

  abstract blockCommunity(
    payload: { community_id: number; block: boolean },
    options?: RequestOptions,
  ): Promise<{ community_view: CommunityView }>;

  abstract blockPerson(
    payload: { person_id: number; block: boolean },
    options?: RequestOptions,
  ): Promise<{ person_view: PersonView }>;

  abstract createPostReport(
    payload: { post_id: number; reason: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract createCommentReport(
    payload: { comment_id: number; reason: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract createPrivateMessageReport(
    payload: { private_message_id: number; reason: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract getSiteMetadata(
    payload: { url: string },
    options?: RequestOptions,
  ): Promise<GetSiteMetadataResponse>;

  abstract resolvePostReport(
    payload: { report_id: number; resolved: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract resolveCommentReport(
    payload: { report_id: number; resolved: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract getRandomCommunity(
    payload: { type_: ListingType },
    options?: RequestOptions,
  ): Promise<{ community_view: CommunityView }>;

  abstract listPostReports(
    payload: { page: number; limit: number; unresolved_only?: boolean },
    options?: RequestOptions,
  ): Promise<{ post_reports: PostReportView[] }>;

  abstract listCommentReports(
    payload: { page: number; limit: number; unresolved_only?: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_reports: CommentReportView[] }>;
}
