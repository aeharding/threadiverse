import { CommentNode, CommentView } from "../../types";

export function buildCommentsTree(comments: CommentView[]): CommentNode[] {
  const map = new Map<number, CommentNode>();

  for (const comment_view of comments) {
    const node: CommentNode = {
      children: [],
      comment_view,
    };
    map.set(comment_view.comment.id, { ...node });
  }

  const tree: CommentNode[] = [];

  for (const comment_view of comments) {
    const child = map.get(comment_view.comment.id);
    if (child) {
      const parent_id = comment_view.comment.parentId;
      if (parent_id) {
        const parent = map.get(parent_id);
        // Necessary because blocked comment might not exist
        if (parent) {
          parent.children.push(child);
        }
      } else {
        tree.push(child);
      }
    }
  }

  return tree;
}

/**
 * Traverse an existing comment tree to determine if there are any
 * missing comments for a given node
 *
 * NOTE: This function mutates the tree to add `missing` to each node!
 */
export function buildCommentsTreeWithMissing(
  comments: CommentView[],
): CommentNode[] {
  const tree = buildCommentsTree(comments);

  for (const node of tree) {
    childHasMissing(node);
  }

  return tree;
}

function childHasMissing(node: CommentNode) {
  let missing = node.comment_view.counts.child_count;

  for (const child of node.children) {
    missing--;

    // the child is responsible for showing missing indicator
    // if the child has missing comments
    missing -= child.comment_view.counts.child_count;

    childHasMissing(child);
  }

  node.missing = missing;
}
