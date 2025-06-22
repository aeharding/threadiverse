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
} from "lemmy-js-client";
import { CommunityVisibility } from "../../types/CommunityVisibility";
import { GetModlogResponse } from "../../types";

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
