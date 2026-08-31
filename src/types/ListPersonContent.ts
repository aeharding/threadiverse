import type { PageParams } from "./PageParams";
import type { PiefedCommentSort, PiefedPostSort } from "./PiefedSortTypes";
import type { PostSortTypeByMode } from "./PostSortType";

/**
 * Gets a person's content (posts and comments)
 *
 * `username` is available on Lemmy. PieFed requires `person_id`.
 *
 * Sorting is provider-specific. Pass `mode` with a provider's sort value;
 * omit both when the connected provider is not known yet. Lemmy v1 does not
 * currently expose a sort for this endpoint.
 */
export type ListPersonContent = ListPersonContentBase &
  (
    | ListPersonContentByMode[keyof ListPersonContentByMode]
    | {
        mode?: never;
        person_id: number;
        sort?: never;
        type?: PersonContentType;
        username?: never;
      }
  );

export type ListPersonContentByMode = {
  lemmyv0: LemmyPersonIdentifier & {
    mode: "lemmyv0";
    sort?: PostSortTypeByMode["lemmyv0"]["sort"];
    type?: PersonContentType;
  };
  lemmyv1: LemmyPersonIdentifier & {
    mode: "lemmyv1";
    sort?: never;
    type?: PersonContentType;
  };
  piefed: PiefedListPersonContent;
};

type LemmyPersonIdentifier =
  | {
      person_id: number;
      username?: string;
    }
  | {
      person_id?: number;
      username: string;
    };

type ListPersonContentBase = PageParams & {
  page_back?: boolean;
  person_id?: number;
};

type PersonContentType = "all" | "comments" | "posts";

type PiefedListPersonContent =
  | {
      mode: "piefed";
      person_id: number;
      sort?: PiefedCommentSort & PiefedPostSort;
      type?: "all";
      username?: never;
    }
  | {
      mode: "piefed";
      person_id: number;
      sort?: PiefedCommentSort;
      type: "comments";
      username?: never;
    }
  | {
      mode: "piefed";
      person_id: number;
      sort?: PiefedPostSort;
      type: "posts";
      username?: never;
    };
