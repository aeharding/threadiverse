import { Search as LemmyV0Search } from "lemmy-js-client";
import { Search as LemmyV1Search } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type SearchSortType =
  | SearchSortTypeByMode[keyof SearchSortTypeByMode]
  | {
      mode?: never;
      sort?: never;
    };

export type SearchSortTypeByMode = {
  lemmyv0: Required<Pick<LemmyV0Search, "sort">> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1Search, "time_range_seconds"> &
    Required<Pick<LemmyV1Search, "sort">> & {
      mode: "lemmyv1";
    };
  piefed: Required<Pick<components["schemas"]["Search"], "sort">> & {
    mode: "piefed";
  };
};
