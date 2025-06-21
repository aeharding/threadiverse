import { GetComments as LemmyV0GetComments } from "lemmy-js-client";
import { GetComments as LemmyV1GetComments } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type CommentSortType =
  | ({
      mode: "lemmyv0";
    } & Pick<LemmyV0GetComments, "sort">)
  | ({
      mode: "lemmyv1";
    } & Pick<LemmyV1GetComments, "sort" | "time_range_seconds">)
  | ({
      mode: "piefed";
    } & Pick<components["schemas"]["GetComments"], "sort">);
