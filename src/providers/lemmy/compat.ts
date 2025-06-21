import {
  CommentReplyView,
  CommentReportView,
  CommentView,
  CommunityView,
  PersonMentionView,
  PostReportView,
  PostView,
} from "lemmy-js-client";

export function compatLemmyCommunityView(communityView: CommunityView) {
  return communityView;
}

export function compatLemmyPostView(post: PostView) {
  return post;
}

export function compatLemmyCommentView(comment: CommentView) {
  return comment;
}

export function compatLemmyMentionView(personMention: PersonMentionView) {
  return personMention;
}

export function compatLemmyReplyView(personMention: CommentReplyView) {
  return personMention;
}

export function compatLemmyCommentReportView(commentReport: CommentReportView) {
  return commentReport;
}

export function compatLemmyPostReportView(postReport: PostReportView) {
  return postReport;
}
