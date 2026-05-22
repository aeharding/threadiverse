import {
  CommentReportView,
  CommentView,
  ModlogItem,
  PostReportView,
  PostView,
} from "../../types";

export function getLogDate(item: ModlogItem): string {
  return item.modlog.published_at;
}

export function getPostCommentItemCreatedDate(
  item: CommentReportView | CommentView | PostReportView | PostView,
): number {
  if ("comment" in item) return Date.parse(item.comment.published);
  return Date.parse(item.post.published);
}

const getPublishedDate = (item: CommentView | PostView) => {
  if ("comment" in item) {
    return item.comment.published;
  } else {
    return item.post.published;
  }
};

export function sortPostCommentByPublished(
  a: CommentView | PostView,
  b: CommentView | PostView,
): number {
  return getPublishedDate(b).localeCompare(getPublishedDate(a));
}
