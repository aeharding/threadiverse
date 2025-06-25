import type { z } from "zod/v4-mini";
import * as schemas from "../schemas";

// Zod schema inferred types
export type GetSiteResponse = z.infer<typeof schemas.GetSiteResponse>;
export type GetCommunityResponse = z.infer<typeof schemas.GetCommunityResponse>;
export type Comment = z.infer<typeof schemas.Comment>;
export type CommentView = z.infer<typeof schemas.CommentView>;
export type CommentReply = z.infer<typeof schemas.CommentReply>;
export type CommentReplyView = z.infer<typeof schemas.CommentReplyView>;
export type CommentReport = z.infer<typeof schemas.CommentReport>;
export type CommentReportView = z.infer<typeof schemas.CommentReportView>;
export type MyUserInfo = z.infer<typeof schemas.MyUserInfo>;
export type Community = z.infer<typeof schemas.Community>;
export type CommunityAggregates = z.infer<typeof schemas.CommunityAggregates>;
export type CommentAggregates = z.infer<typeof schemas.CommentAggregates>;
export type Site = z.infer<typeof schemas.Site>;
export type SiteView = z.infer<typeof schemas.SiteView>;
export type SiteAggregates = z.infer<typeof schemas.SiteAggregates>;
export type ResolveObjectResponse = z.infer<
  typeof schemas.ResolveObjectResponse
>;
export type PostAggregates = z.infer<typeof schemas.PostAggregates>;
export type CommunityFollowerView = z.infer<
  typeof schemas.CommunityFollowerView
>;
export type CommunityModeratorView = z.infer<
  typeof schemas.CommunityModeratorView
>;
export type PrivateMessageView = z.infer<typeof schemas.PrivateMessageView>;
export type CommunityView = z.infer<typeof schemas.CommunityView>;
export type CommunityVisibility = z.infer<typeof schemas.CommunityVisibility>;
export type FederatedInstances = z.infer<typeof schemas.FederatedInstances>;
export type GetCaptchaResponse = z.infer<typeof schemas.GetCaptchaResponse>;
export type Instance = z.infer<typeof schemas.Instance>;
export type InstanceWithFederationState = z.infer<
  typeof schemas.InstanceWithFederationState
>;
export type ListingType = z.infer<typeof schemas.ListingType>;
export type ListPersonContentResponse = z.infer<
  typeof schemas.ListPersonContentResponse
>;
export type ListReportsResponse = z.infer<typeof schemas.ListReportsResponse>;
export type LoginResponse = z.infer<typeof schemas.LoginResponse>;
export type Notification = z.infer<typeof schemas.Notification>;
export type Person = z.infer<typeof schemas.Person>;
export type PersonMention = z.infer<typeof schemas.PersonMention>;
export type PersonMentionView = z.infer<typeof schemas.PersonMentionView>;
export type PersonView = z.infer<typeof schemas.PersonView>;
export type PersonAggregates = z.infer<typeof schemas.PersonAggregates>;
export type Post = z.infer<typeof schemas.Post>;
export type PostReport = z.infer<typeof schemas.PostReport>;
export type PostReportView = z.infer<typeof schemas.PostReportView>;
export type PostView = z.infer<typeof schemas.PostView>;
export type RegistrationMode = z.infer<typeof schemas.RegistrationMode>;
export type SubscribedType = z.infer<typeof schemas.SubscribedType>;
export type UploadImageResponse = z.infer<typeof schemas.UploadImageResponse>;
export type GetPersonDetailsResponse = z.infer<
  typeof schemas.GetPersonDetailsResponse
>;
export type GetSiteMetadataResponse = z.infer<
  typeof schemas.GetSiteMetadataResponse
>;
export type LinkMetadata = z.infer<typeof schemas.LinkMetadata>;
export type GetModlogResponse = z.infer<typeof schemas.GetModlogResponse>;
export type ModRemovePost = z.infer<typeof schemas.ModRemovePost>;
export type ModLockPost = z.infer<typeof schemas.ModLockPost>;
export type ModFeaturePost = z.infer<typeof schemas.ModFeaturePost>;
export type ModRemoveComment = z.infer<typeof schemas.ModRemoveComment>;
export type ModRemoveCommunity = z.infer<typeof schemas.ModRemoveCommunity>;
export type ModBanFromCommunity = z.infer<typeof schemas.ModBanFromCommunity>;
export type ModBan = z.infer<typeof schemas.ModBan>;
export type ModAddCommunity = z.infer<typeof schemas.ModAddCommunity>;
export type ModTransferCommunity = z.infer<typeof schemas.ModTransferCommunity>;
export type ModAdd = z.infer<typeof schemas.ModAdd>;
export type AdminPurgePerson = z.infer<typeof schemas.AdminPurgePerson>;
export type AdminPurgeCommunity = z.infer<typeof schemas.AdminPurgeCommunity>;
export type AdminPurgePost = z.infer<typeof schemas.AdminPurgePost>;
export type AdminPurgeComment = z.infer<typeof schemas.AdminPurgeComment>;
export type ModHideCommunity = z.infer<typeof schemas.ModHideCommunity>;
export type ModRemovePostView = z.infer<typeof schemas.ModRemovePostView>;
export type ModLockPostView = z.infer<typeof schemas.ModLockPostView>;
export type ModFeaturePostView = z.infer<typeof schemas.ModFeaturePostView>;
export type ModRemoveCommentView = z.infer<typeof schemas.ModRemoveCommentView>;
export type ModRemoveCommunityView = z.infer<
  typeof schemas.ModRemoveCommunityView
>;
export type ModBanFromCommunityView = z.infer<
  typeof schemas.ModBanFromCommunityView
>;
export type ModBanView = z.infer<typeof schemas.ModBanView>;
export type ModAddCommunityView = z.infer<typeof schemas.ModAddCommunityView>;
export type ModTransferCommunityView = z.infer<
  typeof schemas.ModTransferCommunityView
>;
export type ModAddView = z.infer<typeof schemas.ModAddView>;
export type AdminPurgePersonView = z.infer<typeof schemas.AdminPurgePersonView>;
export type AdminPurgeCommunityView = z.infer<
  typeof schemas.AdminPurgeCommunityView
>;
export type AdminPurgePostView = z.infer<typeof schemas.AdminPurgePostView>;
export type AdminPurgeCommentView = z.infer<
  typeof schemas.AdminPurgeCommentView
>;
export type ModHideCommunityView = z.infer<typeof schemas.ModHideCommunityView>;
export type GetUnreadCountResponse = z.infer<
  typeof schemas.GetUnreadCountResponse
>;

// Re-export existing TypeScript types and interfaces
export type * from "./EditComment";
export type * from "./CreateComment";
export type * from "./CreatePost";
export type * from "./EditPost";
export type * from "./GetPost";
export type * from "./GetComments";
export type * from "./CommentSortType";
export type * from "../schemas/GetCommunityResponse";
export type * from "./GetCommunity";
export type * from "./PostSortType";
export type * from "./GetPosts";
export type * from "./ListCommunities";
export type * from "./Search";
export type * from "./Register";
export type * from "./ListReports";
export type * from "./GetModlog";
export type * from "../schemas/GetModlogResponse";
export type * from "./GetReplies";
export type * from "./BanFromCommunity";
export type * from "../schemas/GetSiteMetadataResponse";
export type * from "./SearchType";
export type * from "./SearchSortType";
export type * from "./CommunitySortType";
export type * from "./GetPersonMentions";
export type * from "./GetPrivateMessages";
export type * from "./ListPersonContent";

// TODO: unified error handling in threadiverse project
export type { LemmyErrorType } from "lemmy-js-client";
