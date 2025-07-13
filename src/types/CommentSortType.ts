import { GetComments as LemmyV0GetComments } from "lemmy-js-client-v0";
import { GetComments as LemmyV1GetComments } from "lemmy-js-client-v1";

import { operations as mbinOperations } from "../providers/mbin/schema";
import { components as piefedComponents } from "../providers/piefed/schema";

export type CommentSortType =
  | CommentSortTypeByMode[keyof CommentSortTypeByMode];

export type CommentSortTypeByMode = {
  lemmyv0: Required<Pick<LemmyV0GetComments, "sort">> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1GetComments, "time_range_seconds"> &
    Required<Pick<LemmyV1GetComments, "sort">> & {
      mode: "lemmyv1";
    };
  mbin: Required<
    Pick<
      NonNullable<
        mbinOperations["get_api_entry_comments"]["parameters"]["query"]
      >,
      "sortBy"
    >
  > & {
    mode: "mbin";
  };
  piefed: Required<Pick<piefedComponents["schemas"]["GetComments"], "sort">> & {
    mode: "piefed";
  };
};
