import * as types from "./types";

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
  ): Promise<types.ResolveObjectResponse>;

  abstract getSite(options?: RequestOptions): Promise<types.GetSiteResponse>;

  abstract getCommunity(
    payload: types.GetCommunity,
    options?: RequestOptions,
  ): Promise<types.GetCommunityResponse>;

  abstract getPosts(
    payload: types.GetPosts,
    options?: RequestOptions,
  ): Promise<{ posts: types.PostView[]; next_page?: string }>;

  abstract getComments(
    payload: types.GetComments,
    options?: RequestOptions,
  ): Promise<{ comments: types.CommentView[] }>;

  abstract getPost(
    payload: types.GetPost,
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract createPost(
    payload: types.CreatePost,
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract editPost(
    payload: types.EditPost,
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract createComment(
    payload: types.CreateComment,
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract editComment(
    payload: types.EditComment,
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract createPrivateMessage(
    payload: { content: string; recipient_id: number },
    options?: RequestOptions,
  ): Promise<{ private_message_view: types.PrivateMessageView }>;

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
  ): Promise<types.GetUnreadCountResponse>;

  abstract getFederatedInstances(options?: RequestOptions): Promise<{
    federated_instances?: types.FederatedInstances;
  }>;

  abstract markPostAsRead(
    payload: { post_ids: number[]; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract likePost(
    payload: { post_id: number; score: number },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract likeComment(
    payload: { comment_id: number; score: number },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract savePost(
    payload: { post_id: number; save: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract deletePost(
    payload: { post_id: number; deleted: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract removePost(
    payload: { post_id: number; removed: boolean; reason?: string },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract lockPost(
    payload: { post_id: number; locked: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract featurePost(
    payload: {
      post_id: number;
      featured: boolean;
      feature_type: "Community" | "Local";
    },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract listCommunities(
    payload: types.ListCommunities,
    options?: RequestOptions,
  ): Promise<{ communities: types.CommunityView[] }>;

  abstract search(
    payload: types.Search,
    options?: RequestOptions,
  ): Promise<{
    comments: types.CommentView[];
    posts: types.PostView[];
    communities: types.CommunityView[];
    users: types.PersonView[];
  }>;

  abstract getPersonDetails(
    payload: { person_id: number } | { username: string },
    options?: RequestOptions,
  ): Promise<types.GetPersonDetailsResponse>;

  abstract listPersonContent(
    payload: types.ListPersonContent,
    options?: RequestOptions,
  ): Promise<types.ListPersonContentResponse>;

  abstract listPersonSaved(
    payload: {
      person_id: number;
      page?: number;
      limit: number;
    },
    options?: RequestOptions,
  ): Promise<types.ListPersonContentResponse>;

  abstract getNotifications(
    payload: types.GetPersonMentions,
    options?: RequestOptions,
  ): Promise<{
    notifications: types.Notification[];
  }>;

  abstract getPersonMentions(
    payload: types.GetPersonMentions,
    options?: RequestOptions,
  ): Promise<{ mentions: types.PersonMentionView[] }>;

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
    payload: types.GetPrivateMessages,
    options?: RequestOptions,
  ): Promise<{ private_messages: types.PrivateMessageView[] }>;

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
  ): Promise<types.UploadImageResponse>;

  abstract deleteImage(
    payload: { url: string; delete_token: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract register(
    payload: types.Register,
    options?: RequestOptions,
  ): Promise<types.LoginResponse>;

  abstract getCaptcha(
    options?: RequestOptions,
  ): Promise<types.GetCaptchaResponse>;

  abstract listReports(
    payload: types.ListReports,
    options?: RequestOptions,
  ): Promise<types.ListReportsResponse>;

  abstract getModlog(
    payload: types.GetModlog,
    options?: RequestOptions,
  ): Promise<types.GetModlogResponse>;

  abstract getReplies(
    payload: types.GetReplies,
    options?: RequestOptions,
  ): Promise<{ replies: types.CommentReplyView[] }>;

  abstract banFromCommunity(
    payload: types.BanFromCommunity,
    options?: RequestOptions,
  ): Promise<void>;

  abstract saveComment(
    payload: { comment_id: number; save: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract distinguishComment(
    payload: { comment_id: number; distinguished: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract deleteComment(
    payload: { comment_id: number; deleted: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract removeComment(
    payload: { comment_id: number; removed: boolean; reason?: string },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract followCommunity(
    payload: { community_id: number; follow: boolean },
    options?: RequestOptions,
  ): Promise<{ community_view: types.CommunityView }>;

  abstract blockCommunity(
    payload: { community_id: number; block: boolean },
    options?: RequestOptions,
  ): Promise<{ community_view: types.CommunityView }>;

  abstract blockPerson(
    payload: { person_id: number; block: boolean },
    options?: RequestOptions,
  ): Promise<{ person_view: types.PersonView }>;

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
  ): Promise<types.GetSiteMetadataResponse>;

  abstract resolvePostReport(
    payload: { report_id: number; resolved: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract resolveCommentReport(
    payload: { report_id: number; resolved: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract getRandomCommunity(
    payload: { type_: types.ListingType },
    options?: RequestOptions,
  ): Promise<{ community_view: types.CommunityView }>;

  abstract listPostReports(
    payload: { page: number; limit: number; unresolved_only?: boolean },
    options?: RequestOptions,
  ): Promise<{ post_reports: types.PostReportView[] }>;

  abstract listCommentReports(
    payload: { page: number; limit: number; unresolved_only?: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_reports: types.CommentReportView[] }>;
}
