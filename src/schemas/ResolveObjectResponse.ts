import { z } from "zod/v4-mini";
import { CommentView } from "./CommentView";
import { CommunityView } from "./CommunityView";
import { PersonView } from "./PersonView";
import { PostView } from "./PostView";

export const ResolveObjectResponse = z.object({
  comment: z.optional(CommentView),
  post: z.optional(PostView),
  community: z.optional(CommunityView),
  person: z.optional(PersonView),
});
