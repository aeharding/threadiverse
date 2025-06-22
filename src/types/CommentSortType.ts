import { GetComments as LemmyV0GetComments } from "lemmy-js-client";
import { GetComments as LemmyV1GetComments } from "lemmy-js-client-v1";
import { components } from "../providers/piefed/schema";

export type CommentSortTypeByMode = {
  piefed: {
    mode: "piefed";
  } & (Pick<components["schemas"]["GetComments"], "sort"> | object);
  lemmyv0: {
    mode: "lemmyv0";
  } & (Pick<LemmyV0GetComments, "sort"> | object);
  lemmyv1: {
    mode: "lemmyv1";
  } & (Pick<LemmyV1GetComments, "sort" | "time_range_seconds"> | object);
};

export type CommentSortType =
  | CommentSortTypeByMode[keyof CommentSortTypeByMode]
  | {
      mode?: undefined;
    };
