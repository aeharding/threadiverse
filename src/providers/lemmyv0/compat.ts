import type * as LemmyV0 from "lemmy-js-client";

import { InvalidPayloadError } from "../../errors";
import * as types from "../../types";

/**
 * This is a total hack, because the lemmy-js-client types are incorrect for lemmy v0
 */
export function compatBlocks(
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
      .map(compatCommunity),
    instance_blocks: blocks.instance_blocks.map((t) =>
      "instance" in t ? (t.instance as LemmyV0.Instance) : t,
    ),
    person_blocks: blocks.person_blocks.map((t) =>
      "target" in t ? (t.target as LemmyV0.Person) : t,
    ),
  };
}

export function compatCommunity(community: LemmyV0.Community) {
  return {
    ...community,
    visibility: compatCommunityVisibility(community.visibility),
  };
}

export function compatLemmyCommentReportView(
  commentReport: LemmyV0.CommentReportView,
) {
  return {
    ...commentReport,
    community: compatCommunity(commentReport.community),
  };
}

export function compatLemmyCommentView(comment: LemmyV0.CommentView) {
  return {
    ...comment,
    community: compatCommunity(comment.community),
  };
}

export function compatLemmyCommunityFollowerView(
  communityFollower: LemmyV0.CommunityFollowerView,
) {
  return {
    ...communityFollower,
    community: compatCommunity(communityFollower.community),
  };
}

export function compatLemmyCommunityModeratorView(
  communityModerator: LemmyV0.CommunityModeratorView,
) {
  return {
    ...communityModerator,
    community: compatCommunity(communityModerator.community),
  };
}

export function compatLemmyCommunityView(communityView: LemmyV0.CommunityView) {
  return {
    ...communityView,
    community: compatCommunity(communityView.community),
  };
}

export function compatLemmyLocalSite(
  localSite: LemmyV0.LocalSite,
): types.LocalSite {
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

export function compatLemmyMentionView(
  personMention: LemmyV0.PersonMentionView,
) {
  return {
    ...personMention,
    community: compatCommunity(personMention.community),
  };
}

export function compatLemmyModlogView(
  modlog: LemmyV0.GetModlogResponse[keyof LemmyV0.GetModlogResponse][number],
): types.ModlogItem {
  if ("community" in modlog) {
    return {
      ...modlog,
      community: compatCommunity(modlog.community),
    };
  }

  return modlog;
}

export function compatLemmyPageParams<const T extends types.PageParams>(
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

export function compatLemmyPageResponse(
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

export function compatLemmyPostReportView(postReport: LemmyV0.PostReportView) {
  return {
    ...postReport,
    community: compatCommunity(postReport.community),
  };
}

export function compatLemmyPostView(post: LemmyV0.PostView) {
  return {
    ...post,
    community: compatCommunity(post.community),
  };
}

export function compatLemmyReplyView(personMention: LemmyV0.CommentReplyView) {
  return {
    ...personMention,
    community: compatCommunity(personMention.community),
  };
}

function compatCommunityVisibility(
  visibility: LemmyV0.CommunityVisibility,
): types.CommunityVisibility {
  return visibility === "LocalOnly" ? "LocalOnlyPublic" : visibility;
}
