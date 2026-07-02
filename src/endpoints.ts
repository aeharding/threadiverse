import { z } from "zod/v4-mini";

import type { BaseClient } from "./BaseClient";

import * as schemas from "./schemas";

/**
 * Every endpoint must map to a schema validating the full resolved response;
 * `null` (skip validation) is only permitted — and required — for endpoints
 * that resolve with `void`. The schema's output must be assignable to the
 * return type declared on `BaseClient`, and every `BaseClient` member must
 * be an async method (the install loops wrap everything in `async`) — all
 * enforced here at compile time.
 */
type EndpointTable = {
  [K in keyof BaseClient]: BaseClient[K] extends (
    ...params: never[]
  ) => Promise<infer Response>
    ? [Response] extends [void]
      ? null
      : z.ZodMiniType<Response>
    : never;
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

type AnyMethod = (...params: unknown[]) => Promise<unknown>;

type EndpointSchema = (typeof endpoints)[EndpointName];

/**
 * Install a method for every endpoint in the table onto a prototype.
 * `Object.defineProperty` keeps the methods non-enumerable, matching
 * class-method semantics (so `for...in` over a client stays clean).
 */
export function installEndpointMethods(
  prototype: object,
  build: (endpoint: EndpointName, schema: EndpointSchema) => AnyMethod,
): void {
  for (const [endpoint, schema] of Object.entries(endpoints) as [
    EndpointName,
    EndpointSchema,
  ][]) {
    Object.defineProperty(prototype, endpoint, {
      configurable: true,
      enumerable: false,
      value: build(endpoint, schema),
      writable: true,
    });
  }
}
