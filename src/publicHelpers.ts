import { CommentNode, CommentView } from "./types";

/**
 * When hydrating the tree with additional comments, append to the tree (don't shift anything)
 * @param tree
 * @param comments
 */
export function appendComments(
  tree: CommentNode[],
  comments: CommentNode[],
): CommentNode[] {
  // Recursively search tree for parentId, and:
  // 1. Append to the parent's children
  // 2. Adjust `missing` count

  for (const comment of comments) {
    const commentId = comment.comment_view.comment.id;
    const parentId = comment.comment_view.comment.parentId;

    // Early return for top-level comments
    if (parentId === undefined) {
      if (!tree.some((node) => node.comment_view.comment.id === commentId)) {
        tree.push(comment);
      }
      continue;
    }

    // Find the parent node recursively
    const parentNode = findParentNode(tree, parentId);
    if (!parentNode) continue;

    // Check for duplicates at the same level (same parent)
    if (
      parentNode.children.some(
        (node) => node.comment_view.comment.id === commentId,
      )
    ) {
      continue;
    }

    // Append to parent's children
    parentNode.children.push(comment);

    // Adjust missing count - decrease by 1 since we added a comment
    if (parentNode.missing !== undefined && parentNode.missing > 0) {
      parentNode.missing -= 1;
    }
  }

  return tree;
}

/**
 * When the user posts a new comment, prepend to the tree (show at top inside the tree)
 */
export function prependComment(
  tree: CommentNode[],
  comment: CommentView,
): CommentNode[] {
  const commentNode: CommentNode = {
    children: [],
    comment_view: comment,
  };

  const commentId = commentNode.comment_view.comment.id;
  const parentId = commentNode.comment_view.comment.parentId;

  // Early return for top-level comments
  if (parentId === undefined) {
    if (!tree.some((node) => node.comment_view.comment.id === commentId)) {
      tree.unshift(commentNode);
    }
    return tree;
  }

  // Find the parent node recursively
  const parentNode = findParentNode(tree, parentId);
  if (!parentNode) return tree;

  // Check for duplicates at the same level (same parent)
  if (
    parentNode.children.some(
      (node) => node.comment_view.comment.id === commentId,
    )
  ) {
    return tree;
  }

  // Prepend to parent's children (show at top)
  parentNode.children.unshift(commentNode);

  // Adjust missing count - decrease by 1 since we added a comment
  if (parentNode.missing !== undefined && parentNode.missing > 0) {
    parentNode.missing -= 1;
  }

  return tree;
}

/**
 * Recursively search for a comment node with the given ID
 */
function findParentNode(
  nodes: CommentNode[],
  targetId: number,
): CommentNode | null {
  for (const node of nodes) {
    if (node.comment_view.comment.id === targetId) {
      return node;
    }

    // Recursively search children
    const found = findParentNode(node.children, targetId);
    if (found) {
      return found;
    }
  }

  return null;
}
