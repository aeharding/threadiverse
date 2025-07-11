import { Comment as LemmyV0Comment } from "lemmy-js-client-v0";
import { Comment as LemmyV1Comment } from "lemmy-js-client-v1";

export function getDepthFromComment(
  comment: LemmyV0Comment | LemmyV1Comment,
): number {
  return getDepthFromCommentPath(comment.path);
}

export function getDepthFromCommentPath(path: string): number {
  const len = path.split(".").length;
  return len - 2;
}

export function getLemmyCommentParentId(
  comment: LemmyV0Comment | LemmyV1Comment,
): number | undefined {
  const split = comment.path.split(".");
  // remove the 0
  split.shift();

  return split.length > 1 ? Number(split.at(split.length - 2)) : undefined;
}

export function getLemmyCommentRootId(
  comment: LemmyV0Comment | LemmyV1Comment,
): number {
  const split = comment.path.split(".");

  return Number(split.at(1));
}
