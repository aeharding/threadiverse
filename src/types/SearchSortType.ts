import { Search as LemmyV0Search } from "lemmy-js-client";
import { Search as LemmyV1Search } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type SearchSortType =
  | SearchSortTypeByMode[keyof SearchSortTypeByMode]
  | {
      mode?: undefined;
    };

export type SearchSortTypeByMode = {
  lemmyv0: Pick<LemmyV0Search, "sort"> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1Search, "sort" | "time_range_seconds"> & {
    mode: "lemmyv1";
  };
  piefed: Pick<components["schemas"]["Search"], "sort"> & {
    mode: "piefed";
  };
};
