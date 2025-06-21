import { GetComments as LemmyV0GetComments } from "lemmy-js-client";
import { GetComments as LemmyV1GetComments } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type CommentSortType =
  | ({
      mode: "lemmyv0";
    } & (Pick<LemmyV0GetComments, "sort"> | object))
  | ({
      mode: "lemmyv1";
    } & (Pick<LemmyV1GetComments, "sort" | "time_range_seconds"> | object))
  | ({
      mode: "piefed";
    } & (Pick<components["schemas"]["GetComments"], "sort"> | object))
  | { mode?: undefined };
