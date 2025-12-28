import type * as types from "./types";

export interface BaseClientOptions {
  fetchFunction?: typeof fetch;
  headers?: Record<string, string>;
}

export interface ProviderInfo {
  name: "lemmy" | "piefed";
  version: string;
}

export type RequestOptions = Pick<RequestInit, "signal">;

export type ThreadiverseMode = "lemmyv0" | "lemmyv1" | "piefed";

// Abstract base class that all providers should extend
export abstract class BaseClient {
  static mode: ThreadiverseMode;

  static softwareName: "lemmy" | "piefed";
  /**
   * NPM semver range, e.g. ">=1.0.0 <2.0.0"
   */
  static softwareVersionRange: string;

  abstract banFromCommunity(
    payload: types.BanFromCommunity,
    options?: RequestOptions,
  ): Promise<void>;

  abstract blockCommunity(
    payload: { block: boolean; community_id: number },
    options?: RequestOptions,
  ): Promise<{ community_view: types.CommunityView }>;

  abstract blockInstance(
    payload: { block: boolean; instance_id: number },
    options?: RequestOptions,
  ): Promise<void>;

  abstract blockPerson(
    payload: { block: boolean; person_id: number },
    options?: RequestOptions,
  ): Promise<{ person_view: types.PersonView }>;

  abstract createComment(
    payload: types.CreateComment,
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract createCommentReport(
    payload: { comment_id: number; reason: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract createPost(
    payload: types.CreatePost,
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract createPostReport(
    payload: { post_id: number; reason: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract createPrivateMessage(
    payload: { content: string; recipient_id: number },
    options?: RequestOptions,
  ): Promise<{ private_message_view: types.PrivateMessageView }>;

  abstract createPrivateMessageReport(
    payload: { private_message_id: number; reason: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract deleteComment(
    payload: { comment_id: number; deleted: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract deleteImage(
    payload: { delete_token: string; url: string },
    options?: RequestOptions,
  ): Promise<void>;

  abstract deletePost(
    payload: { deleted: boolean; post_id: number },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract distinguishComment(
    payload: { comment_id: number; distinguished: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract editComment(
    payload: types.EditComment,
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract editPost(
    payload: types.EditPost,
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract featurePost(
    payload: {
      feature_type: "Community" | "Local";
      featured: boolean;
      post_id: number;
    },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract followCommunity(
    payload: { community_id: number; follow: boolean },
    options?: RequestOptions,
  ): Promise<{ community_view: types.CommunityView }>;

  abstract getCaptcha(
    options?: RequestOptions,
  ): Promise<types.GetCaptchaResponse>;

  abstract getComments(
    payload: types.GetComments,
    options?: RequestOptions,
  ): Promise<types.ListCommentsResponse>;

  abstract getCommunity(
    payload: types.GetCommunity,
    options?: RequestOptions,
  ): Promise<types.GetCommunityResponse>;

  abstract getFederatedInstances(options?: RequestOptions): Promise<{
    federated_instances?: types.FederatedInstances;
  }>;

  abstract getModlog(
    payload: types.GetModlog,
    options?: RequestOptions,
  ): Promise<types.ListModlogResponse>;

  abstract getNotifications(
    payload: types.GetPersonMentions,
    options?: RequestOptions,
  ): Promise<types.ListNotificationsResponse>;

  abstract getPersonDetails(
    payload: { person_id: number } | { username: string },
    options?: RequestOptions,
  ): Promise<types.GetPersonDetailsResponse>;

  abstract getPersonMentions(
    payload: types.GetPersonMentions,
    options?: RequestOptions,
  ): Promise<types.ListPersonMentionsResponse>;

  abstract getPost(
    payload: types.GetPost,
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract getPosts(
    payload: types.GetPosts,
    options?: RequestOptions,
  ): Promise<types.ListPostsResponse>;

  abstract getPrivateMessages(
    payload: types.GetPrivateMessages,
    options?: RequestOptions,
  ): Promise<types.ListPrivateMessagesResponse>;

  abstract getRandomCommunity(
    payload: { type_: types.ListingType },
    options?: RequestOptions,
  ): Promise<{ community_view: types.CommunityView }>;

  abstract getReplies(
    payload: types.GetReplies,
    options?: RequestOptions,
  ): Promise<types.ListRepliesResponse>;

  abstract getSite(options?: RequestOptions): Promise<types.GetSiteResponse>;

  abstract getSiteMetadata(
    payload: { url: string },
    options?: RequestOptions,
  ): Promise<types.GetSiteMetadataResponse>;

  abstract getUnreadCount(
    options?: RequestOptions,
  ): Promise<types.GetUnreadCountResponse>;

  abstract likeComment(
    payload: { comment_id: number; score: number },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract likePost(
    payload: { post_id: number; score: number },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract listCommentReports(
    payload: types.PageParams & { unresolved_only?: boolean },
    options?: RequestOptions,
  ): Promise<types.ListCommentReportsResponse>;

  abstract listCommunities(
    payload: types.ListCommunities,
    options?: RequestOptions,
  ): Promise<types.ListCommunitiesResponse>;

  abstract listPersonContent(
    payload: types.ListPersonContent,
    options?: RequestOptions,
  ): Promise<types.ListPersonContentResponse>;

  abstract listPersonLiked(
    payload: types.PageParams & { type: types.LikeType },
    options?: RequestOptions,
  ): Promise<types.ListPersonLikedResponse>;

  abstract listPersonSaved(
    payload: types.PageParams & { person_id: number },
    options?: RequestOptions,
  ): Promise<types.ListPersonContentResponse>;

  abstract listPostReports(
    payload: types.PageParams & { unresolved_only?: boolean },
    options?: RequestOptions,
  ): Promise<types.ListPostReportsResponse>;

  abstract listReports(
    payload: types.ListReports,
    options?: RequestOptions,
  ): Promise<types.ListReportsResponse>;

  abstract lockPost(
    payload: { locked: boolean; post_id: number },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract login(
    payload: {
      password: string;
      totp_2fa_token?: string;
      username_or_email: string;
    },
    options?: RequestOptions,
  ): Promise<{ jwt?: string }>;

  abstract logout(options?: RequestOptions): Promise<void>;

  abstract markAllAsRead(options?: RequestOptions): Promise<void>;

  abstract markCommentReplyAsRead(
    payload: { comment_reply_id: number; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract markPersonMentionAsRead(
    payload: { person_mention_id: number; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract markPostAsRead(
    payload: { post_ids: number[]; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract markPrivateMessageAsRead(
    payload: { private_message_id: number; read: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract register(
    payload: types.Register,
    options?: RequestOptions,
  ): Promise<types.LoginResponse>;

  abstract removeComment(
    payload: { comment_id: number; reason?: string; removed: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract removePost(
    payload: { post_id: number; reason?: string; removed: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract resolveCommentReport(
    payload: { report_id: number; resolved: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract resolveObject(
    payload: {
      q: string;
    },
    options?: RequestOptions,
  ): Promise<types.ResolveObjectResponse>;

  abstract resolvePostReport(
    payload: { report_id: number; resolved: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract saveComment(
    payload: { comment_id: number; save: boolean },
    options?: RequestOptions,
  ): Promise<{ comment_view: types.CommentView }>;

  abstract savePost(
    payload: { post_id: number; save: boolean },
    options?: RequestOptions,
  ): Promise<{ post_view: types.PostView }>;

  abstract saveUserSettings(
    payload: { show_nsfw: boolean },
    options?: RequestOptions,
  ): Promise<void>;

  abstract search(
    payload: types.Search,
    options?: RequestOptions,
  ): Promise<types.ListSearchResponse>;

  abstract uploadImage(
    payload: { file: File },
    options?: RequestOptions,
  ): Promise<types.UploadImageResponse>;
}
