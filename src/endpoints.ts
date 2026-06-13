import { z } from "zod/v4-mini";

import type { BaseClient } from "./BaseClient";

import * as schemas from "./schemas";

/**
 * Every endpoint must map to a schema validating the full resolved response
 * (or `null` when the endpoint resolves with no data to validate). The
 * schema's output must be assignable to the return type declared on
 * `BaseClient` — that contract is enforced here at compile time.
 */
type EndpointTable = {
  [K in keyof BaseClient]: null | z.ZodMiniType<
    Awaited<ReturnType<BaseClient[K]>>
  >;
};

const CommentViewResponse = z.object({ comment_view: schemas.CommentView });

const CommunityViewResponse = z.object({
  community_view: schemas.CommunityView,
});

const PostViewResponse = z.object({ post_view: schemas.PostView });

/**
 * The single source of truth for the public API surface: maps every
 * `BaseClient` method to the Zod schema used to validate its response.
 *
 * `SafeClient` (response validation) and `ThreadiverseClient` (delegation)
 * are derived from this table, so adding an endpoint means adding a row
 * here, declaring it on `BaseClient`, and implementing it in each provider.
 */
export const endpoints = {
  banFromCommunity: null,
  blockCommunity: CommunityViewResponse,
  blockInstance: null,
  blockPerson: z.object({ person_view: schemas.PersonView }),
  createComment: CommentViewResponse,
  createCommentReport: null,
  createPost: PostViewResponse,
  createPostReport: null,
  createPrivateMessage: z.object({
    private_message_view: schemas.PrivateMessageView,
  }),
  createPrivateMessageReport: null,
  deleteComment: CommentViewResponse,
  deleteImage: null,
  deletePost: PostViewResponse,
  distinguishComment: CommentViewResponse,
  editComment: CommentViewResponse,
  editCommunityNotifications: null,
  editPost: PostViewResponse,
  editPostNotifications: null,
  featurePost: PostViewResponse,
  followCommunity: CommunityViewResponse,
  getCaptcha: schemas.GetCaptchaResponse,
  getComments: schemas.ListCommentsResponse,
  getCommunity: schemas.GetCommunityResponse,
  getFederatedInstances: z.object({
    federated_instances: z.optional(schemas.FederatedInstances),
  }),
  getModlog: schemas.ListModlogResponse,
  getNotifications: schemas.ListNotificationsResponse,
  getPersonDetails: schemas.GetPersonDetailsResponse,
  getPost: PostViewResponse,
  getPosts: schemas.ListPostsResponse,
  getRandomCommunity: CommunityViewResponse,
  getSite: schemas.GetSiteResponse,
  getSiteMetadata: schemas.GetSiteMetadataResponse,
  getUnreadCount: schemas.GetUnreadCountResponse,
  likeComment: CommentViewResponse,
  likePost: PostViewResponse,
  listCommentReports: schemas.ListCommentReportsResponse,
  listCommunities: schemas.ListCommunitiesResponse,
  listPersonContent: schemas.ListPersonContentResponse,
  listPersonLiked: schemas.ListPersonLikedResponse,
  listPersonSaved: schemas.ListPersonContentResponse,
  listPostReports: schemas.ListPostReportsResponse,
  listReports: schemas.ListReportsResponse,
  lockPost: PostViewResponse,
  login: schemas.LoginResponse,
  logout: null,
  markAllAsRead: null,
  markNotificationAsRead: null,
  markPostAsRead: null,
  register: schemas.LoginResponse,
  removeComment: CommentViewResponse,
  removePost: PostViewResponse,
  resolveCommentReport: null,
  resolveObject: schemas.ResolveObjectResponse,
  resolvePostReport: null,
  saveComment: CommentViewResponse,
  savePost: PostViewResponse,
  saveUserSettings: null,
  search: schemas.ListSearchResponse,
  uploadImage: schemas.UploadImageResponse,
} satisfies EndpointTable;

export type EndpointName = keyof typeof endpoints;
