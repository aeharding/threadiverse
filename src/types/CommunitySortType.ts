import { ListCommunities as LemmyV0ListCommunities } from "lemmy-js-client-v0";
import { ListCommunities as LemmyV1ListCommunities } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type CommunitySortType =
  | CommunitySortTypeByMode[keyof CommunitySortTypeByMode]
  | {
      mode?: never;
      sort?: CommunitySortTypeByMode["lemmyv0"]["sort"] &
        CommunitySortTypeByMode["lemmyv1"]["sort"] &
        CommunitySortTypeByMode["piefed"]["sort"];
    };

export type CommunitySortTypeByMode = {
  lemmyv0: Required<Pick<LemmyV0ListCommunities, "sort">> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1ListCommunities, "time_range_seconds"> &
    Required<Pick<LemmyV1ListCommunities, "sort">> & {
      mode: "lemmyv1";
    };
  piefed: Required<Pick<components["schemas"]["ListCommunities"], "sort">> & {
    mode: "piefed";
  };
};
