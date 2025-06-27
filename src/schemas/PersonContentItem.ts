import { z } from "zod/v4-mini";

import { CommentView } from "./CommentView";
import { PostView } from "./PostView";

/**
 * A person's content response.
 */
export const PersonContentItem = z.union([PostView, CommentView]);
