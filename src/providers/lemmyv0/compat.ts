import type * as LemmyV0 from "lemmy-js-client-v0";

import { InvalidPayloadError } from "../../errors";
import * as types from "../../types";

export function fromPageParams<const T extends types.PageParams>(
  params: T,
): Omit<T, "page_cursor"> & { limit?: number; page?: number } {
  const result: T = { ...params };

  const page_cursor = result.page_cursor;
  delete result.page_cursor;

  if (typeof page_cursor === "string")
    throw new InvalidPayloadError(
      "lemmyv0 does not support string page_cursor",
    );

  return {
    ...(result as Omit<T, "page_cursor">),
    limit: params.limit,
    page: page_cursor ? Number(page_cursor) : undefined,
  };
}

/**
 * This is a total hack, because the lemmy-js-client types are incorrect for lemmy v0
 */
export function toBlocks(
  blocks: Pick<
    LemmyV0.MyUserInfo,
    "community_blocks" | "instance_blocks" | "person_blocks"
  >,
): Pick<
  types.MyUserInfo,
  "community_blocks" | "instance_blocks" | "person_blocks"
> {
  return {
    community_blocks: blocks.community_blocks
      .map((t) => ("community" in t ? (t.community as LemmyV0.Community) : t))
      .map(toCommunity),
    instance_blocks: blocks.instance_blocks.map((t) =>
      "instance" in t ? (t.instance as LemmyV0.Instance) : t,
    ),
    person_blocks: blocks.person_blocks.map((t) =>
      "target" in t ? (t.target as LemmyV0.Person) : t,
    ),
  };
}

export function toCommentReportView(commentReport: LemmyV0.CommentReportView) {
  return {
    ...commentReport,
    community: toCommunity(commentReport.community),
  };
}

export function toCommentView(comment: LemmyV0.CommentView) {
  return {
    ...comment,
    community: toCommunity(comment.community),
  };
}

export function toCommunity(community: LemmyV0.Community) {
  return {
    ...community,
    visibility: compatCommunityVisibility(community.visibility),
  };
}

export function toCommunityFollowerView(
  communityFollower: LemmyV0.CommunityFollowerView,
) {
  return {
    ...communityFollower,
    community: toCommunity(communityFollower.community),
  };
}

export function toCommunityModeratorView(
  communityModerator: LemmyV0.CommunityModeratorView,
) {
  return {
    ...communityModerator,
    community: toCommunity(communityModerator.community),
  };
}

export function toCommunityView(communityView: LemmyV0.CommunityView) {
  return {
    ...communityView,
    community: toCommunity(communityView.community),
  };
}

export function toLocalSite(localSite: LemmyV0.LocalSite): types.LocalSite {
  // @ts-expect-error - lemmy-js-client-v0 types are incorrect for this property
  const downvotes_disabled = localSite.enable_downvotes === false;

  const downvotesMode = downvotes_disabled ? "Disable" : "All";

  return {
    ...localSite,
    comment_downvotes: downvotesMode,
    comment_upvotes: "All",
    post_downvotes: downvotesMode,
    post_upvotes: "All",
  };
}

export function toMentionView(personMention: LemmyV0.PersonMentionView) {
  return {
    ...personMention,
    community: toCommunity(personMention.community),
  };
}

export function toModlogView(
  modlog: LemmyV0.GetModlogResponse[keyof LemmyV0.GetModlogResponse][number],
): types.ModlogItem {
  if ("community" in modlog) {
    return {
      ...modlog,
      community: toCommunity(modlog.community),
    };
  }

  return modlog;
}

export function toPageResponse(
  params: types.PageParams,
): types.PagableResponse {
  const page_cursor = params.page_cursor;

  if (typeof page_cursor === "string")
    throw new InvalidPayloadError(
      "lemmyv0 does not support string page_cursor",
    );

  return {
    next_page: (page_cursor ?? 1) + 1,
  };
}

export function toPostReportView(postReport: LemmyV0.PostReportView) {
  return {
    ...postReport,
    community: toCommunity(postReport.community),
  };
}

export function toPostView(post: LemmyV0.PostView) {
  return {
    ...post,
    community: toCommunity(post.community),
  };
}

export function toReplyView(personMention: LemmyV0.CommentReplyView) {
  return {
    ...personMention,
    community: toCommunity(personMention.community),
  };
}

function compatCommunityVisibility(
  visibility: LemmyV0.CommunityVisibility,
): types.CommunityVisibility {
  return visibility === "LocalOnly" ? "LocalOnlyPublic" : visibility;
}
