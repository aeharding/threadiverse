import { Search as LemmyV0Search } from "lemmy-js-client";
import { Search as LemmyV1Search } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type SearchSortTypeByMode = {
  piefed: {
    mode: "piefed";
  } & Pick<components["schemas"]["Search"], "sort">;
  lemmyv0: {
    mode: "lemmyv0";
  } & Pick<LemmyV0Search, "sort">;
  lemmyv1: {
    mode: "lemmyv1";
  } & Pick<LemmyV1Search, "sort" | "time_range_seconds">;
};

export type SearchSortType =
  | SearchSortTypeByMode[keyof SearchSortTypeByMode]
  | {
      mode?: undefined;
    };
