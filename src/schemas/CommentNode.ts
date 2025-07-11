import { z } from "zod/v4-mini";

import { CommentView } from "./CommentView";

const BaseCommentNode = z.object({
  comment_view: CommentView,
  missing: z.optional(z.number()),
});

type CommentNodeType = z.infer<typeof BaseCommentNode> & {
  children: CommentNodeType[];
};

export const CommentNode: z.ZodMiniType<CommentNodeType> = z.extend(
  BaseCommentNode,
  {
    children: z.lazy(
      (): z.ZodMiniArray<typeof CommentNode> => z.array(CommentNode),
    ),
  },
);
