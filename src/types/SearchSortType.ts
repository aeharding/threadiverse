import { Search as LemmyV0Search } from "lemmy-js-client-v0";
import { Search as LemmyV1Search } from "lemmy-js-client-v1";

import { paths } from "../providers/piefed/schema";

export type SearchSortType =
  | SearchSortTypeByMode[keyof SearchSortTypeByMode]
  | {
      mode?: never;
      sort?: SearchSortTypeByMode["lemmyv0"]["sort"] &
        SearchSortTypeByMode["lemmyv1"]["sort"] &
        SearchSortTypeByMode["piefed"]["sort"];
    };

export type SearchSortTypeByMode = {
  lemmyv0: Required<Pick<LemmyV0Search, "sort">> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1Search, "time_range_seconds"> &
    Required<Pick<LemmyV1Search, "sort">> & {
      mode: "lemmyv1";
    };
  piefed: Pick<
    Required<
      NonNullable<paths["/api/alpha/search"]["get"]["parameters"]["query"]>
    >,
    "sort"
  > & {
    mode: "piefed";
  };
};
