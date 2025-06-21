import { ListCommunities as LemmyV0ListCommunities } from "lemmy-js-client";
import { ListCommunities as LemmyV1ListCommunities } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type CommunitySortType =
  | ({
      mode: "lemmyv0";
    } & (Pick<LemmyV0ListCommunities, "sort"> | object))
  | ({
      mode: "lemmyv1";
    } & (Pick<LemmyV1ListCommunities, "sort" | "time_range_seconds"> | object))
  | ({
      mode: "piefed";
    } & (Pick<components["schemas"]["ListCommunities"], "sort"> | object))
  | { mode?: undefined };
