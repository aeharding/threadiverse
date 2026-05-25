import type { z } from "zod/v4-mini";

import * as schemas from "../schemas";

export type Comment = z.infer<typeof schemas.Comment>;
export type CommentReport = z.infer<typeof schemas.CommentReport>;
export type CommentReportView = z.infer<typeof schemas.CommentReportView>;
export type CommentView = z.infer<typeof schemas.CommentView>;
export type Community = z.infer<typeof schemas.Community>;
export type CommunityFollowerView = z.infer<
  typeof schemas.CommunityFollowerView
>;
export type CommunityModeratorView = z.infer<
  typeof schemas.CommunityModeratorView
>;
export type CommunityNotificationsMode = z.infer<
  typeof schemas.CommunityNotificationsMode
>;
export type CommunityView = z.infer<typeof schemas.CommunityView>;
export type CommunityVisibility = z.infer<typeof schemas.CommunityVisibility>;
export type FederatedInstances = z.infer<typeof schemas.FederatedInstances>;
export type GetCaptchaResponse = z.infer<typeof schemas.GetCaptchaResponse>;
export type GetCommunityResponse = z.infer<typeof schemas.GetCommunityResponse>;
export type GetPersonDetailsResponse = z.infer<
  typeof schemas.GetPersonDetailsResponse
>;
export type GetSiteMetadataResponse = z.infer<
  typeof schemas.GetSiteMetadataResponse
>;
// Zod schema inferred types
export type GetSiteResponse = z.infer<typeof schemas.GetSiteResponse>;
export type GetUnreadCountResponse = z.infer<
  typeof schemas.GetUnreadCountResponse
>;
export type Instance = z.infer<typeof schemas.Instance>;
export type InstanceWithFederationState = z.infer<
  typeof schemas.InstanceWithFederationState
>;
export type LinkMetadata = z.infer<typeof schemas.LinkMetadata>;
export type ListCommentReportsResponse = z.infer<
  typeof schemas.ListCommentReportsResponse
>;
export type ListCommentsResponse = z.infer<typeof schemas.ListCommentsResponse>;
export type ListCommunitiesResponse = z.infer<
  typeof schemas.ListCommunitiesResponse
>;
export type ListingType = z.infer<typeof schemas.ListingType>;
export type ListModlogResponse = z.infer<typeof schemas.ListModlogResponse>;
export type ListNotificationsResponse = z.infer<
  typeof schemas.ListNotificationsResponse
>;
export type ListPersonContentResponse = z.infer<
  typeof schemas.ListPersonContentResponse
>;
export type ListPersonLikedResponse = z.infer<
  typeof schemas.ListPersonLikedResponse
>;
export type ListPostReportsResponse = z.infer<
  typeof schemas.ListPostReportsResponse
>;
export type ListPostsResponse = z.infer<typeof schemas.ListPostsResponse>;
export type ListReportsResponse = z.infer<typeof schemas.ListReportsResponse>;
export type ListSearchResponse = z.infer<typeof schemas.ListSearchResponse>;
export type LocalSite = z.infer<typeof schemas.LocalSite>;
export type LoginResponse = z.infer<typeof schemas.LoginResponse>;
export type Modlog = z.infer<typeof schemas.Modlog>;
export type ModlogItem = z.infer<typeof schemas.ModlogItem>;
export type ModlogKind = z.infer<typeof schemas.ModlogKind>;
export type MyUserInfo = z.infer<typeof schemas.MyUserInfo>;
export type Notification = z.infer<typeof schemas.Notification>;
export type NotificationDataType = z.infer<typeof schemas.NotificationDataType>;
export type NotificationView = z.infer<typeof schemas.NotificationView>;
export type PagableResponse = z.infer<typeof schemas.PagableResponse>;
export type PageCursor = z.infer<typeof schemas.PageCursor>;
export type Person = z.infer<typeof schemas.Person>;
export type PersonContentItem = z.infer<typeof schemas.PersonContentItem>;
export type PersonMention = z.infer<typeof schemas.PersonMention>;
export type PersonView = z.infer<typeof schemas.PersonView>;
export type PiefedErrorResponse = z.infer<typeof schemas.PiefedErrorResponse>;
export type Post = z.infer<typeof schemas.Post>;
export type PostNotificationsMode = z.infer<
  typeof schemas.PostNotificationsMode
>;
export type PostReport = z.infer<typeof schemas.PostReport>;
export type PostReportView = z.infer<typeof schemas.PostReportView>;
export type PostView = z.infer<typeof schemas.PostView>;
export type PrivateMessage = z.infer<typeof schemas.PrivateMessage>;
export type PrivateMessageView = z.infer<typeof schemas.PrivateMessageView>;
export type RegistrationMode = z.infer<typeof schemas.RegistrationMode>;
export type ResolveObjectResponse = z.infer<
  typeof schemas.ResolveObjectResponse
>;
export type SearchItem = z.infer<typeof schemas.SearchItem>;
export type Site = z.infer<typeof schemas.Site>;
export type SiteView = z.infer<typeof schemas.SiteView>;
export type SubscribedType = z.infer<typeof schemas.SubscribedType>;
export type UploadImageResponse = z.infer<typeof schemas.UploadImageResponse>;

// Re-export existing TypeScript types and interfaces
export type * from "../schemas/GetCommunityResponse";
export type * from "../schemas/GetModlogResponse";
export type * from "../schemas/GetSiteMetadataResponse";
export type * from "./BanFromCommunity";
export type * from "./CommentSortType";
export type * from "./CommunitySortType";
export type * from "./CreateComment";
export type * from "./CreatePost";
export type * from "./EditComment";
export type * from "./EditCommunityNotifications";
export type * from "./EditPost";
export type * from "./EditPostNotifications";
export type * from "./GetComments";
export type * from "./GetCommunity";
export type * from "./GetModlog";
export type * from "./GetNotifications";
export type * from "./GetPost";
export type * from "./GetPosts";
export type * from "./LikeType";
export type * from "./ListCommunities";
export type * from "./ListPersonContent";
export type * from "./ListReports";
export type * from "./PageParams";
export type * from "./PostSortType";
export type * from "./Register";
export type * from "./Search";
export type * from "./SearchSortType";
export type * from "./SearchType";

// TODO: unified error handling in threadiverse project
export type { LemmyErrorType } from "lemmy-js-client-v0";
