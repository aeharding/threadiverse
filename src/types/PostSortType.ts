import { GetPosts as LemmyV0GetPosts } from "lemmy-js-client-v0";
import { GetPosts as LemmyV1GetPosts } from "lemmy-js-client-v1";

import { operations as mbinOperations } from "../providers/mbin/schema";
import { components as piefedComponents } from "../providers/piefed/schema";

export type PostSortType =
  | PostSortTypeByMode[keyof PostSortTypeByMode]
  | {
      mode?: never;
      sort?: PostSortTypeByMode["lemmyv0"]["sort"] &
        PostSortTypeByMode["lemmyv1"]["sort"] &
        PostSortTypeByMode["mbin"]["sort"] &
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
  mbin: Pick<
    NonNullable<
      mbinOperations["get_api_entries_collection"]["parameters"]["query"]
    >,
    "time"
  > &
    Required<
      Pick<
        NonNullable<
          mbinOperations["get_api_entries_collection"]["parameters"]["query"]
        >,
        "sort"
      >
    > & {
      mode: "mbin";
    };
  piefed: Required<Pick<piefedComponents["schemas"]["GetPosts"], "sort">> & {
    mode: "piefed";
  };
};
