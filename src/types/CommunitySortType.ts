import { ListCommunities as LemmyV0ListCommunities } from "lemmy-js-client";
import { ListCommunities as LemmyV1ListCommunities } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type CommunitySortType =
  | CommunitySortTypeByMode[keyof CommunitySortTypeByMode]
  | {
      mode?: undefined;
    };

export type CommunitySortTypeByMode = {
  lemmyv0: Pick<LemmyV0ListCommunities, "sort"> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1ListCommunities, "sort" | "time_range_seconds"> & {
    mode: "lemmyv1";
  };
  piefed: Pick<components["schemas"]["ListCommunities"], "sort"> & {
    mode: "piefed";
  };
};
