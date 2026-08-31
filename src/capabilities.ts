import type { BaseClient, ThreadiverseMode } from "./BaseClient";
import type { EndpointName as CanonicalEndpointName } from "./endpoints";
import type {
  BanFromCommunity,
  EditCommunityNotifications,
  EditPostNotifications,
  GetNotifications,
  LikeType,
  NotificationDataType,
} from "./types";

/** Parameters relevant to `banFromCommunity` support. */
export type BanFromCommunitySupportParameters = Readonly<
  Partial<BanFromCommunity>
>;

/** Parameters relevant to `deleteImage` support. */
export type DeleteImageSupportParameters = Readonly<
  Partial<Parameters<BaseClient["deleteImage"]>[0]>
>;

/** Parameters relevant to `editCommunityNotifications` support. */
export type EditCommunityNotificationsSupportParameters = Readonly<
  Partial<EditCommunityNotifications>
>;

/** Parameters relevant to `editPostNotifications` support. */
export type EditPostNotificationsSupportParameters = Readonly<
  Partial<EditPostNotifications>
>;

/** The name of an endpoint in Threadiverse's canonical client surface. */
export type EndpointName = CanonicalEndpointName;

/** Optional fine-grained capability arguments for a canonical endpoint. */
export type EndpointSupportArguments<Endpoint extends EndpointName> =
  Endpoint extends ParameterizedEndpointName
    ? [] | [parameters: EndpointSupportParameters[Endpoint]]
    : [];

/** Canonical endpoints whose support varies by a payload parameter. */
export interface EndpointSupportParameters {
  banFromCommunity: BanFromCommunitySupportParameters;
  deleteImage: DeleteImageSupportParameters;
  editCommunityNotifications: EditCommunityNotificationsSupportParameters;
  editPostNotifications: EditPostNotificationsSupportParameters;
  getNotifications: GetNotificationsSupportParameters;
  listPersonLiked: ListPersonLikedSupportParameters;
  markNotificationAsRead: MarkNotificationAsReadSupportParameters;
}

/** Parameters relevant to `getNotifications` support. */
export type GetNotificationsSupportParameters = Readonly<
  Partial<GetNotifications>
>;

/** Parameters relevant to `listPersonLiked` support. */
export type ListPersonLikedSupportParameters = Readonly<{
  like_type: LikeType;
}>;

/** Parameters relevant to `markNotificationAsRead` support. */
export type MarkNotificationAsReadSupportParameters = Readonly<{
  kind: NotificationDataType;
  notification_id?: number;
  read?: boolean;
}>;

export type ParameterizedEndpointName = keyof EndpointSupportParameters;

/**
 * Static endpoint support for one compatibility mode.
 *
 * A `true` value means the provider can honor every otherwise-valid canonical
 * payload for the endpoint. It does not imply that the current user is
 * authorized or that an instance's policy permits the operation.
 *
 * An endpoint with provider-specific parameter support is conservatively
 * `false` here. Use the parameter-aware form of {@link providerSupports} to
 * preflight a particular payload.
 */
export type ProviderCapabilities = Readonly<Record<EndpointName, boolean>>;

type ParameterSupportHandlers = {
  readonly [Mode in ThreadiverseMode]: {
    readonly [Endpoint in ParameterizedEndpointName]: (
      parameters: EndpointSupportParameters[Endpoint],
    ) => boolean;
  };
};

// Kept explicit so adding an endpoint to the canonical table is a compile
// error here until its support is classified for every provider.
const allEndpointsSupported = Object.freeze({
  banFromCommunity: true,
  blockCommunity: true,
  blockInstance: true,
  blockPerson: true,
  createComment: true,
  createCommentReport: true,
  createPost: true,
  createPostReport: true,
  createPrivateMessage: true,
  createPrivateMessageReport: true,
  deleteComment: true,
  deleteImage: true,
  deletePost: true,
  distinguishComment: true,
  editComment: true,
  editCommunityNotifications: true,
  editPost: true,
  editPostNotifications: true,
  featurePost: true,
  followCommunity: true,
  getCaptcha: true,
  getComments: true,
  getCommunity: true,
  getFederatedInstances: true,
  getModlog: true,
  getNotifications: true,
  getPersonDetails: true,
  getPost: true,
  getPosts: true,
  getRandomCommunity: true,
  getSite: true,
  getSiteMetadata: true,
  getUnreadCount: true,
  likeComment: true,
  likePost: true,
  listCommentReports: true,
  listCommunities: true,
  listPersonContent: true,
  listPersonLiked: true,
  listPersonSaved: true,
  listPostReports: true,
  listReports: true,
  lockPost: true,
  login: true,
  logout: true,
  markAllAsRead: true,
  markNotificationAsRead: true,
  markPostAsRead: true,
  register: true,
  removeComment: true,
  removePost: true,
  resolveCommentReport: true,
  resolveObject: true,
  resolvePostReport: true,
  saveComment: true,
  savePost: true,
  saveUserSettings: true,
  search: true,
  uploadImage: true,
}) satisfies ProviderCapabilities;

const lemmyv0Capabilities = Object.freeze({
  ...allEndpointsSupported,
  deleteImage: false,
  editCommunityNotifications: false,
  editPostNotifications: false,
  getRandomCommunity: false,
}) satisfies ProviderCapabilities;

const lemmyv1Capabilities = Object.freeze({
  ...allEndpointsSupported,
  getFederatedInstances: false,
}) satisfies ProviderCapabilities;

const piefedCapabilities = Object.freeze({
  ...allEndpointsSupported,
  banFromCommunity: false,
  editCommunityNotifications: false,
  editPostNotifications: false,
  getCaptcha: false,
  getNotifications: false,
  getRandomCommunity: false,
  listPersonLiked: false,
  markNotificationAsRead: false,
  register: false,
}) satisfies ProviderCapabilities;

const parameterSupportHandlers: ParameterSupportHandlers = Object.freeze({
  lemmyv0: Object.freeze({
    banFromCommunity: () => true,
    deleteImage: (parameters: DeleteImageSupportParameters) =>
      Boolean(parameters.delete_token),
    editCommunityNotifications: () => false,
    editPostNotifications: () => false,
    getNotifications: () => true,
    listPersonLiked: () => true,
    markNotificationAsRead: () => true,
  }),
  lemmyv1: Object.freeze({
    banFromCommunity: () => true,
    deleteImage: () => true,
    editCommunityNotifications: () => true,
    editPostNotifications: () => true,
    getNotifications: () => true,
    listPersonLiked: () => true,
    markNotificationAsRead: () => true,
  }),
  piefed: Object.freeze({
    banFromCommunity: (parameters: BanFromCommunitySupportParameters) =>
      !parameters.remove_or_restore_data,
    deleteImage: () => true,
    editCommunityNotifications: (
      parameters: EditCommunityNotificationsSupportParameters,
    ) =>
      parameters.mode === "all_posts" ||
      parameters.mode === "replies_and_mentions",
    editPostNotifications: (
      parameters: EditPostNotificationsSupportParameters,
    ) =>
      parameters.mode === "all_comments" ||
      parameters.mode === "replies_and_mentions",
    getNotifications: (parameters: GetNotificationsSupportParameters) =>
      parameters.type_ !== "mod_action",
    listPersonLiked: (parameters: ListPersonLikedSupportParameters) =>
      parameters.like_type === "liked_only",
    markNotificationAsRead: (
      parameters: MarkNotificationAsReadSupportParameters,
    ) => parameters.kind !== "mod_action",
  }),
});

/** Static endpoint support, keyed by compatibility mode. */
export const providerCapabilities: Readonly<
  Record<ThreadiverseMode, ProviderCapabilities>
> = Object.freeze({
  lemmyv0: lemmyv0Capabilities,
  lemmyv1: lemmyv1Capabilities,
  piefed: piefedCapabilities,
});

/** Return the immutable endpoint capability map for a compatibility mode. */
export function getProviderCapabilities(
  mode: ThreadiverseMode,
): ProviderCapabilities {
  return providerCapabilities[mode];
}

/**
 * Check complete endpoint support, or a particular payload for an endpoint
 * with provider-specific parameter support.
 */
export function providerSupports<Endpoint extends EndpointName>(
  mode: ThreadiverseMode,
  endpoint: Endpoint,
  ...[parameters]: EndpointSupportArguments<NoInfer<Endpoint>>
): boolean {
  if (parameters !== undefined) {
    // The public generic ties parameters to endpoint. TypeScript loses that
    // correlation when indexing a mapped function table at runtime; the
    // exhaustive `ParameterSupportHandlers` annotation preserves it.
    const handler = parameterSupportHandlers[mode][
      endpoint as ParameterizedEndpointName
    ] as (parameters: unknown) => boolean;
    return handler(parameters);
  }

  return providerCapabilities[mode][endpoint];
}
