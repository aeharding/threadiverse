import type { z } from "zod/v4-mini";

import * as schemas from "../schemas";

export interface Comment extends z.infer<typeof schemas.Comment> {}
export interface CommentReport extends z.infer<typeof schemas.CommentReport> {}
export interface CommentReportView extends z.infer<
  typeof schemas.CommentReportView
> {}
export interface CommentView extends z.infer<typeof schemas.CommentView> {}
export interface Community extends z.infer<typeof schemas.Community> {}
export interface CommunityFollowerView extends z.infer<
  typeof schemas.CommunityFollowerView
> {}
export interface CommunityModeratorView extends z.infer<
  typeof schemas.CommunityModeratorView
> {}
export type CommunityNotificationsMode = z.infer<
  typeof schemas.CommunityNotificationsMode
>;
export interface CommunityView extends z.infer<typeof schemas.CommunityView> {}
export type CommunityVisibility = z.infer<typeof schemas.CommunityVisibility>;
export interface FederatedInstances extends z.infer<
  typeof schemas.FederatedInstances
> {}
export interface GetCaptchaResponse extends z.infer<
  typeof schemas.GetCaptchaResponse
> {}
export interface GetCommunityResponse extends z.infer<
  typeof schemas.GetCommunityResponse
> {}
export interface GetPersonDetailsResponse extends z.infer<
  typeof schemas.GetPersonDetailsResponse
> {}
export interface GetSiteMetadataResponse extends z.infer<
  typeof schemas.GetSiteMetadataResponse
> {}
// Zod schema inferred types
export interface GetSiteResponse extends z.infer<
  typeof schemas.GetSiteResponse
> {}
export interface GetUnreadCountResponse extends z.infer<
  typeof schemas.GetUnreadCountResponse
> {}
export interface Instance extends z.infer<typeof schemas.Instance> {}
export interface InstanceWithFederationState extends z.infer<
  typeof schemas.InstanceWithFederationState
> {}
export interface LinkMetadata extends z.infer<typeof schemas.LinkMetadata> {}
export interface ListCommentReportsResponse extends z.infer<
  typeof schemas.ListCommentReportsResponse
> {}
export interface ListCommentsResponse extends z.infer<
  typeof schemas.ListCommentsResponse
> {}
export interface ListCommunitiesResponse extends z.infer<
  typeof schemas.ListCommunitiesResponse
> {}
export type ListingType = z.infer<typeof schemas.ListingType>;
export interface ListModlogResponse extends z.infer<
  typeof schemas.ListModlogResponse
> {}
export interface ListNotificationsResponse extends z.infer<
  typeof schemas.ListNotificationsResponse
> {}
export interface ListPersonContentResponse extends z.infer<
  typeof schemas.ListPersonContentResponse
> {}
export interface ListPersonLikedResponse extends z.infer<
  typeof schemas.ListPersonLikedResponse
> {}
export interface ListPostReportsResponse extends z.infer<
  typeof schemas.ListPostReportsResponse
> {}
export interface ListPostsResponse extends z.infer<
  typeof schemas.ListPostsResponse
> {}
export interface ListReportsResponse extends z.infer<
  typeof schemas.ListReportsResponse
> {}
export interface ListSearchResponse extends z.infer<
  typeof schemas.ListSearchResponse
> {}
export interface LocalSite extends z.infer<typeof schemas.LocalSite> {}
export interface LoginResponse extends z.infer<typeof schemas.LoginResponse> {}
export interface Modlog extends z.infer<typeof schemas.Modlog> {}
export interface ModlogItem extends z.infer<typeof schemas.ModlogItem> {}
export type ModlogKind = z.infer<typeof schemas.ModlogKind>;
export interface MyUserInfo extends z.infer<typeof schemas.MyUserInfo> {}
export interface Notification extends z.infer<typeof schemas.Notification> {}
export type NotificationDataType = z.infer<typeof schemas.NotificationDataType>;
export interface NotificationView extends z.infer<
  typeof schemas.NotificationView
> {}
export interface PagableResponse extends z.infer<
  typeof schemas.PagableResponse
> {}
export type PageCursor = z.infer<typeof schemas.PageCursor>;
export interface Person extends z.infer<typeof schemas.Person> {}
export type PersonContentItem = z.infer<typeof schemas.PersonContentItem>;
export interface PersonMention extends z.infer<typeof schemas.PersonMention> {}
export interface PersonView extends z.infer<typeof schemas.PersonView> {}
export interface PiefedErrorResponse extends z.infer<
  typeof schemas.PiefedErrorResponse
> {}
export interface Post extends z.infer<typeof schemas.Post> {}
export type PostNotificationsMode = z.infer<
  typeof schemas.PostNotificationsMode
>;
export interface PostReport extends z.infer<typeof schemas.PostReport> {}
export interface PostReportView extends z.infer<
  typeof schemas.PostReportView
> {}
export interface PostTag extends z.infer<typeof schemas.PostTag> {}
export interface PostView extends z.infer<typeof schemas.PostView> {}
export interface PrivateMessage extends z.infer<
  typeof schemas.PrivateMessage
> {}
export interface PrivateMessageView extends z.infer<
  typeof schemas.PrivateMessageView
> {}
export type RegistrationMode = z.infer<typeof schemas.RegistrationMode>;
export interface ResolveObjectResponse extends z.infer<
  typeof schemas.ResolveObjectResponse
> {}
export type SearchItem = z.infer<typeof schemas.SearchItem>;
export interface Site extends z.infer<typeof schemas.Site> {}
export interface SiteView extends z.infer<typeof schemas.SiteView> {}
export type SubscribedType = z.infer<typeof schemas.SubscribedType>;
export interface UploadImageResponse extends z.infer<
  typeof schemas.UploadImageResponse
> {}

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
