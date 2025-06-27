import { z } from "zod/v4-mini";

import { CommentView } from "./CommentView";
import { CommunityView } from "./CommunityView";
import { PersonView } from "./PersonView";
import { PostView } from "./PostView";

export const SearchItem = z.union([
  CommentView,
  CommunityView,
  PersonView,
  PostView,
]);
