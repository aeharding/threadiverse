import { Search as LemmyV0Search } from "lemmy-js-client";
import { Search as LemmyV1Search } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type SearchSortType =
  | ({
      mode: "lemmyv0";
    } & (Pick<LemmyV0Search, "sort"> | object))
  | ({
      mode: "lemmyv1";
    } & (Pick<LemmyV1Search, "sort" | "time_range_seconds"> | object))
  | ({
      mode: "piefed";
    } & (Pick<components["schemas"]["Search"], "sort"> | object))
  | { mode?: undefined };
