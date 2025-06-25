import { GetPosts as LemmyV0GetPosts } from "lemmy-js-client";
import { GetPosts as LemmyV1GetPosts } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type PostSortType =
  | PostSortTypeByMode[keyof PostSortTypeByMode]
  | {
      mode?: undefined;
    };

export type PostSortTypeByMode = {
  lemmyv0: Pick<LemmyV0GetPosts, "sort"> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1GetPosts, "sort" | "time_range_seconds"> & {
    mode: "lemmyv1";
  };
  piefed: Pick<components["schemas"]["GetPosts"], "sort"> & {
    mode: "piefed";
  };
};
