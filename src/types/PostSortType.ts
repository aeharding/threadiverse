import { GetPosts as LemmyV0GetPosts } from "lemmy-js-client-v0";
import { GetPosts as LemmyV1GetPosts } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type PostSortType =
  | PostSortTypeByMode[keyof PostSortTypeByMode]
  | {
      mode?: never;
      sort?: PostSortTypeByMode["lemmyv0"]["sort"] &
        PostSortTypeByMode["lemmyv1"]["sort"] &
        PostSortTypeByMode["piefed"]["sort"];
    };

export type PostSortTypeByMode = {
  lemmyv0: Required<Pick<LemmyV0GetPosts, "sort">> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1GetPosts, "time_range_seconds"> &
    Required<Pick<LemmyV1GetPosts, "sort">> & {
      mode: "lemmyv1";
    };
  piefed: Required<Pick<components["schemas"]["GetPosts"], "sort">> & {
    mode: "piefed";
  };
};
