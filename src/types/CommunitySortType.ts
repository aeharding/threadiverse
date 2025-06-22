import { ListCommunities as LemmyV0ListCommunities } from "lemmy-js-client";
import { ListCommunities as LemmyV1ListCommunities } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type CommunitySortTypeByMode = {
  piefed: {
    mode: "piefed";
  } & Pick<components["schemas"]["ListCommunities"], "sort">;
  lemmyv0: {
    mode: "lemmyv0";
  } & Pick<LemmyV0ListCommunities, "sort">;
  lemmyv1: {
    mode: "lemmyv1";
  } & Pick<LemmyV1ListCommunities, "sort" | "time_range_seconds">;
};

export type CommunitySortType =
  | CommunitySortTypeByMode[keyof CommunitySortTypeByMode]
  | {
      mode?: undefined;
    };
