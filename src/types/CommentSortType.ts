import { GetComments as LemmyV0GetComments } from "lemmy-js-client";
import { GetComments as LemmyV1GetComments } from "lemmy-js-client-v1";

import { components } from "../providers/piefed/schema";

export type CommentSortType =
  | CommentSortTypeByMode[keyof CommentSortTypeByMode]
  | {
      mode?: undefined;
    };

export type CommentSortTypeByMode = {
  lemmyv0: Pick<LemmyV0GetComments, "sort"> & {
    mode: "lemmyv0";
  };
  lemmyv1: Pick<LemmyV1GetComments, "sort" | "time_range_seconds"> & {
    mode: "lemmyv1";
  };
  piefed: Pick<components["schemas"]["GetComments"], "sort"> & {
    mode: "piefed";
  };
};
