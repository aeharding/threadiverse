import { GetPosts as LemmyV0GetPosts } from "lemmy-js-client";
import { GetPosts as LemmyV1GetPosts } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type PostSortType =
  | ({
      mode: "lemmyv0";
    } & (Pick<LemmyV0GetPosts, "sort"> | object))
  | ({
      mode: "lemmyv1";
    } & (Pick<LemmyV1GetPosts, "sort" | "time_range_seconds"> | object))
  | ({
      mode: "piefed";
    } & (Pick<components["schemas"]["GetPosts"], "sort"> | object))
  | { mode?: undefined };
