import { GetComments as LemmyV0GetComments } from "lemmy-js-client-v0";
import { GetComments as LemmyV1GetComments } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type CommentSortType =
  | CommentSortTypeByMode[keyof CommentSortTypeByMode]
  | {
      mode?: never;
      sort?: CommentSortTypeByMode["lemmyv0"]["sort"] &
        CommentSortTypeByMode["lemmyv1"]["sort"] &
        CommentSortTypeByMode["piefed"]["sort"];
    };

export type CommentSortTypeByMode = {
  lemmyv0: Required<Pick<LemmyV0GetComments, "sort">> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1GetComments, "time_range_seconds"> &
    Required<Pick<LemmyV1GetComments, "sort">> & {
      mode: "lemmyv1";
    };
  piefed: Required<Pick<components["schemas"]["GetComments"], "sort">> & {
    mode: "piefed";
  };
};
