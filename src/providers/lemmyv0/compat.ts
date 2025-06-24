import {
  CommentReplyView,
  CommentReportView,
  CommentView,
  CommunityView,
  PersonMentionView,
  PostReportView,
  PostView,
  Community,
  CommunityVisibility as LemmyCommunityVisibility,
  CommunityModeratorView,
  CommunityFollowerView,
  GetModlogResponse as LemmyGetModlogResponse,
  MyUserInfo as LemmyMyUserInfo,
  Person,
  Instance,
} from "lemmy-js-client";
import {
  CommunityVisibility,
  GetModlogResponse,
  MyUserInfo,
} from "../../types";

export function compatLemmyCommunityView(communityView: CommunityView) {
  return {
    ...communityView,
    community: compatCommunity(communityView.community),
  };
}

export function compatCommunity(community: Community) {
  return {
    ...community,
    visibility: compatCommunityVisibility(community.visibility),
  };
}

function compatCommunityVisibility(
  visibility: LemmyCommunityVisibility,
): CommunityVisibility {
  return visibility === "LocalOnly" ? "LocalOnlyPublic" : visibility;
}

export function compatLemmyPostView(post: PostView) {
  return {
    ...post,
    community: compatCommunity(post.community),
  };
}

export function compatLemmyCommentView(comment: CommentView) {
  return {
    ...comment,
    community: compatCommunity(comment.community),
  };
}

export function compatLemmyMentionView(personMention: PersonMentionView) {
  return {
    ...personMention,
    community: compatCommunity(personMention.community),
  };
}

export function compatLemmyReplyView(personMention: CommentReplyView) {
  return {
    ...personMention,
    community: compatCommunity(personMention.community),
  };
}

export function compatLemmyCommentReportView(commentReport: CommentReportView) {
  return {
    ...commentReport,
    community: compatCommunity(commentReport.community),
  };
}

export function compatLemmyPostReportView(postReport: PostReportView) {
  return {
    ...postReport,
    community: compatCommunity(postReport.community),
  };
}

export function compatLemmyCommunityModeratorView(
  communityModerator: CommunityModeratorView,
) {
  return {
    ...communityModerator,
    community: compatCommunity(communityModerator.community),
  };
}

export function compatLemmyCommunityFollowerView(
  communityFollower: CommunityFollowerView,
) {
  return {
    ...communityFollower,
    community: compatCommunity(communityFollower.community),
  };
}

export function compatLemmyModlogView(
  modlog: LemmyGetModlogResponse[keyof LemmyGetModlogResponse][number],
): GetModlogResponse["modlog"][number] {
  if ("community" in modlog) {
    return {
      ...modlog,
      community: compatCommunity(modlog.community),
    };
  }

  return modlog;
}

/**
 * This is a total hack, because the lemmy-js-client types are incorrect for lemmy v0
 */
export function compatBlocks(
  blocks: Pick<
    LemmyMyUserInfo,
    "person_blocks" | "instance_blocks" | "community_blocks"
  >,
): Pick<MyUserInfo, "person_blocks" | "instance_blocks" | "community_blocks"> {
  return {
    person_blocks: blocks.person_blocks.map((t) =>
      "target" in t ? (t.target as Person) : t,
    ),
    instance_blocks: blocks.instance_blocks.map((t) =>
      "instance" in t ? (t.instance as Instance) : t,
    ),
    community_blocks: blocks.community_blocks
      .map((t) => ("community" in t ? (t.community as Community) : t))
      .map(compatCommunity),
  };
}
