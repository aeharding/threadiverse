import type { z } from "zod/v4-mini";

import * as schemas from "../schemas";

export type AdminPurgeComment = z.infer<typeof schemas.AdminPurgeComment>;
export type AdminPurgeCommentView = z.infer<
  typeof schemas.AdminPurgeCommentView
>;
export type AdminPurgeCommunity = z.infer<typeof schemas.AdminPurgeCommunity>;
export type AdminPurgeCommunityView = z.infer<
  typeof schemas.AdminPurgeCommunityView
>;
export type AdminPurgePerson = z.infer<typeof schemas.AdminPurgePerson>;
export type AdminPurgePersonView = z.infer<typeof schemas.AdminPurgePersonView>;
export type AdminPurgePost = z.infer<typeof schemas.AdminPurgePost>;
export type AdminPurgePostView = z.infer<typeof schemas.AdminPurgePostView>;
export type Comment = z.infer<typeof schemas.Comment>;
export type CommentAggregates = z.infer<typeof schemas.CommentAggregates>;
export type CommentReply = z.infer<typeof schemas.CommentReply>;
export type CommentReplyView = z.infer<typeof schemas.CommentReplyView>;
export type CommentReport = z.infer<typeof schemas.CommentReport>;
export type CommentReportView = z.infer<typeof schemas.CommentReportView>;
export type CommentView = z.infer<typeof schemas.CommentView>;
export type Community = z.infer<typeof schemas.Community>;
export type CommunityAggregates = z.infer<typeof schemas.CommunityAggregates>;
export type CommunityFollowerView = z.infer<
  typeof schemas.CommunityFollowerView
>;
export type CommunityModeratorView = z.infer<
  typeof schemas.CommunityModeratorView
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
export type ListPersonMentionsResponse = z.infer<
  typeof schemas.ListPersonMentionsResponse
>;
export type ListPostReportsResponse = z.infer<
  typeof schemas.ListPostReportsResponse
>;
export type ListPostsResponse = z.infer<typeof schemas.ListPostsResponse>;
export type ListPrivateMessagesResponse = z.infer<
  typeof schemas.ListPrivateMessagesResponse
>;
export type ListRepliesResponse = z.infer<typeof schemas.ListRepliesResponse>;
export type ListReportsResponse = z.infer<typeof schemas.ListReportsResponse>;
export type ListSearchResponse = z.infer<typeof schemas.ListSearchResponse>;
export type LoginResponse = z.infer<typeof schemas.LoginResponse>;
export type ModAdd = z.infer<typeof schemas.ModAdd>;
export type ModAddCommunity = z.infer<typeof schemas.ModAddCommunity>;
export type ModAddCommunityView = z.infer<typeof schemas.ModAddCommunityView>;
export type ModAddView = z.infer<typeof schemas.ModAddView>;
export type ModBan = z.infer<typeof schemas.ModBan>;
export type ModBanFromCommunity = z.infer<typeof schemas.ModBanFromCommunity>;
export type ModBanFromCommunityView = z.infer<
  typeof schemas.ModBanFromCommunityView
>;
export type ModBanView = z.infer<typeof schemas.ModBanView>;
export type ModFeaturePost = z.infer<typeof schemas.ModFeaturePost>;
export type ModFeaturePostView = z.infer<typeof schemas.ModFeaturePostView>;
export type ModHideCommunity = z.infer<typeof schemas.ModHideCommunity>;
export type ModHideCommunityView = z.infer<typeof schemas.ModHideCommunityView>;
export type ModLockPost = z.infer<typeof schemas.ModLockPost>;
export type ModLockPostView = z.infer<typeof schemas.ModLockPostView>;
export type ModlogItem = z.infer<typeof schemas.ModlogItem>;
export type ModRemoveComment = z.infer<typeof schemas.ModRemoveComment>;
export type ModRemoveCommentView = z.infer<typeof schemas.ModRemoveCommentView>;
export type ModRemoveCommunity = z.infer<typeof schemas.ModRemoveCommunity>;
export type ModRemoveCommunityView = z.infer<
  typeof schemas.ModRemoveCommunityView
>;
export type ModRemovePost = z.infer<typeof schemas.ModRemovePost>;
export type ModRemovePostView = z.infer<typeof schemas.ModRemovePostView>;
export type ModTransferCommunity = z.infer<typeof schemas.ModTransferCommunity>;
export type ModTransferCommunityView = z.infer<
  typeof schemas.ModTransferCommunityView
>;
export type MyUserInfo = z.infer<typeof schemas.MyUserInfo>;
export type Notification = z.infer<typeof schemas.Notification>;
export type PagableResponse = z.infer<typeof schemas.PagableResponse>;
export type PageCursor = z.infer<typeof schemas.PageCursor>;
export type Person = z.infer<typeof schemas.Person>;
export type PersonAggregates = z.infer<typeof schemas.PersonAggregates>;
export type PersonContentItem = z.infer<typeof schemas.PersonContentItem>;
export type PersonMention = z.infer<typeof schemas.PersonMention>;
export type PersonMentionView = z.infer<typeof schemas.PersonMentionView>;
export type PersonView = z.infer<typeof schemas.PersonView>;
export type Post = z.infer<typeof schemas.Post>;
export type PostAggregates = z.infer<typeof schemas.PostAggregates>;
export type PostReport = z.infer<typeof schemas.PostReport>;
export type PostReportView = z.infer<typeof schemas.PostReportView>;
export type PostView = z.infer<typeof schemas.PostView>;
export type PrivateMessageView = z.infer<typeof schemas.PrivateMessageView>;
export type RegistrationMode = z.infer<typeof schemas.RegistrationMode>;
export type ResolveObjectResponse = z.infer<
  typeof schemas.ResolveObjectResponse
>;
export type SearchItem = z.infer<typeof schemas.SearchItem>;
export type Site = z.infer<typeof schemas.Site>;
export type SiteAggregates = z.infer<typeof schemas.SiteAggregates>;
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
export type * from "./EditPost";
export type * from "./GetComments";
export type * from "./GetCommunity";
export type * from "./GetModlog";
export type * from "./GetPersonMentions";
export type * from "./GetPost";
export type * from "./GetPosts";
export type * from "./GetPrivateMessages";
export type * from "./GetReplies";
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
export type { LemmyErrorType } from "lemmy-js-client";
